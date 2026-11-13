"""Fábrica de conteúdo do CACD — linha de comando.

Leva o acervo da aluna (livros, apostilas, aulas, provas e anotações) para o sistema. A extração
roda toda no computador, sem serviço de IA: o jeito mais fácil é soltar os arquivos em
acervo/entrada/<tipo>/ e dar dois cliques em "acervo/Adicionar conteúdo.bat".

Comandos (de dentro de backoffice/, com o ambiente virtual):

    .venv\\Scripts\\python content_factory.py status
    .venv\\Scripts\\python content_factory.py scan                 # lê acervo/entrada
    .venv\\Scripts\\python content_factory.py ingest --dry-run     # simula, sem gravar
    .venv\\Scripts\\python content_factory.py ingest               # extrai e grava

Fase de IA (por último; exige GEMINI_API KEY no .env.local):

    .venv\\Scripts\\python content_factory.py ingest --com-vetores --reprocess
    .venv\\Scripts\\python content_factory.py search "trindade impossível" --topic 3.3
    .venv\\Scripts\\python content_factory.py synthesize 3.3

Formato do manifesto, custos e cuidados: backoffice/README.md.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
import traceback
from collections import Counter
from pathlib import Path

BACKOFFICE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKOFFICE_DIR.parent
ACERVO_DIR = PROJECT_ROOT / "acervo"

# Antes de qualquer import do Docling ou do Whisper: os pesos baixados ficam no D:, não no C:.
os.environ.setdefault("HF_HOME", str(BACKOFFICE_DIR / ".cache" / "huggingface"))
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from rich.console import Console  # noqa: E402

from cacd_factory.config import ConfigError, Settings, load_settings  # noqa: E402
from cacd_factory.formats import is_supported  # noqa: E402
from cacd_factory.inbox import INBOX_SUBFOLDERS  # noqa: E402
from cacd_factory.manifest import BibliographyManifest, add_scanned_files, load_manifest, save_manifest  # noqa: E402
from cacd_factory.pipeline import IngestResult, SynthesisResult, file_sha256, ingest_document, synthesize_topic  # noqa: E402
from cacd_factory.sections import document_markdown  # noqa: E402
from cacd_factory.store import SupabaseStore  # noqa: E402

DEFAULT_MANIFEST = BACKOFFICE_DIR / "bibliography_manifest.json"
MIGRATION_HINT = "supabase/migrations/20261114000000_acervo_sem_ia.sql"
RETRIEVAL_PER_SEARCH = 12

console = Console()


def gemini_client(settings: Settings):
    from google import genai

    settings.require("GEMINI_API_KEY")
    return genai.Client(api_key=settings.gemini_api_key)


def describe_topics(records) -> str:
    counts = Counter(record.topic_code or "sem tópico" for record in records)
    return ", ".join(f"{code}: {count}" for code, count in sorted(counts.items()))


def safe_name(title: str) -> str:
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]+', "_", title).strip(" ._")[:120] or "documento"


# --- status ---------------------------------------------------------------------


def cmd_status(args, settings: Settings) -> int:
    store = SupabaseStore.from_settings(settings)
    subject = store.get_subject(args.subject)
    topics = store.get_topics(subject.id)
    summary = store.status_summary(subject, topics)
    console.print(f"[bold]Banco[/bold]: conectado — {subject.name}, {len(topics)} tópicos na trilha.")
    if not store.has_acervo_tables():
        console.print(f"[yellow]A migração do acervo ainda não foi aplicada: rode {MIGRATION_HINT} no SQL Editor.[/yellow]")

    documents = summary["documents"]
    ready = sum(1 for document in documents if document.get("processed_at"))
    console.print(
        f"[bold]Acervo[/bold]: {len(documents)} documento(s), {ready} pronto(s); "
        f"{summary['chunk_count']} trechos para busca, {summary['tagged_chunk_count']} ligados a um tópico."
    )
    for document in documents:
        meta = document.get("metadata") or {}
        state = "pronto" if document.get("processed_at") else "pendente"
        details = [f"{meta.get('section_count', 0)} seções", f"{meta.get('asset_count', 0)} imagens"]
        if meta.get("exam"):
            details.append(f"{meta['exam'].get('items', 0)} itens de prova")
        console.print(f"  • {document['title']} ({document['doc_type']}) — {state}: {', '.join(details)}")

    console.print(f"[bold]Fichas[/bold]: {len(summary['topics_with_lesson'])} de {len(topics)} tópicos.")
    if settings.gemini_api_key:
        console.print("[bold]Gemini[/bold]: chave configurada (usada só na fase de IA).")
    else:
        console.print("[bold]Gemini[/bold]: sem chave — tudo bem: a extração não usa IA.")

    manifest_path = Path(args.manifest)
    if manifest_path.exists():
        console.print(f"[bold]Manifesto[/bold]: {len(load_manifest(manifest_path).documents)} arquivo(s) em {manifest_path.name}.")
    else:
        console.print("[bold]Manifesto[/bold]: ainda não existe. Solte os arquivos em acervo/entrada e rode o scan.")
    return 0


# --- scan -------------------------------------------------------------------------


def cmd_scan(args, settings: Settings) -> int:
    manifest_path = Path(args.manifest).resolve()
    if args.folder:
        root = Path(args.folder)
        if not root.is_dir():
            console.print(f"[red]Pasta não encontrada:[/red] {root}")
            return 1
    else:
        root = Path(args.acervo) / "entrada"
        for folder in INBOX_SUBFOLDERS:
            (root / folder).mkdir(parents=True, exist_ok=True)

    root = root.resolve()
    files = sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and not any(part.startswith(".") for part in path.relative_to(root).parts)
    )
    manifest = load_manifest(manifest_path) if manifest_path.exists() else BibliographyManifest()
    updated, added = add_scanned_files(manifest, files, root=root, subject=args.subject, manifest_dir=manifest_path.parent)
    if manifest.library_root is None:
        # Pasta-base relativa ao manifesto: o projeto continua funcionando se mudar de lugar.
        try:
            relative = Path(os.path.relpath(root, manifest_path.parent))
        except ValueError:
            relative = None  # outra unidade de disco: fica o caminho absoluto
        if relative is not None and relative.parts.count("..") <= 2:
            updated = updated.model_copy(update={"library_root": relative.as_posix()})
    save_manifest(updated, manifest_path)

    ignored = [
        path.relative_to(root) for path in files if not is_supported(path) and path.suffix.lower() not in (".srt", ".vtt")
    ]
    console.print(f"{len(added)} arquivo(s) novo(s) no manifesto; {len(ignored)} ignorado(s) pelo formato.")
    for document in added:
        extra = f"; gabarito: {Path(document.answer_key).name}" if document.answer_key else ""
        console.print(f"  + {document.path} [dim]({document.doc_type}{extra})[/dim]")
    for path in ignored[:10]:
        console.print(f"  [dim]- ignorado: {path.as_posix()}[/dim]")
    if added:
        console.print(
            "Dica: em backoffice/bibliography_manifest.json dá para corrigir título, autor e edição, e ligar "
            "capítulos a tópicos (topic_pages). Também dá para fazer isso depois, pela tela do Acervo."
        )
    return 0


# --- ingest -----------------------------------------------------------------------


def report_ingest(result: IngestResult) -> None:
    counts = f"{result.section_count} seções, {result.asset_count} imagens, {result.chunk_count} trechos"
    if result.status == "ingested":
        console.print(f"  [green]✓ gravado: {counts}[/green] [dim]({describe_topics(result.records)})[/dim]")
        if result.exam_counts:
            exam = result.exam_counts
            console.print(
                f"    prova: {exam.get('stems', 0)} questões, {exam.get('items', 0)} itens com gabarito"
                + (f", {exam['skipped_items']} sem gabarito ou anulados" if exam.get("skipped_items") else "")
                + (f", {exam['essays']} discursivas" if exam.get("essays") else "")
            )
    elif result.status == "skipped":
        console.print(f"  = já está no acervo ({result.section_count} seções); nada a fazer")
    elif result.status == "duplicate":
        console.print(f"  [yellow]≠ o mesmo arquivo já está no acervo como {result.duplicate_of}[/yellow]")
    elif result.status == "empty":
        console.print("  [yellow]! nenhum texto extraído — PDF só de imagens? Confira se o OCR leu as páginas.[/yellow]")
    else:
        console.print(f"  ~ simulação: {counts} [dim]({describe_topics(result.records)})[/dim]")
        for record in result.records[:3]:
            console.print(f"    [dim]{record.citation_label}[/dim]")


def write_outputs(title: str, result: IngestResult, acervo: Path) -> None:
    if result.sections:
        processed = acervo / "processado"
        processed.mkdir(parents=True, exist_ok=True)
        target = processed / f"{safe_name(title)}.md"
        target.write_text(document_markdown(title, result.sections), encoding="utf-8")
        console.print(f"    [dim]texto extraído: acervo/processado/{target.name}[/dim]")
    if result.review_md:
        review = acervo / "revisao"
        review.mkdir(parents=True, exist_ok=True)
        target = review / f"{safe_name(title)}.md"
        target.write_text(result.review_md, encoding="utf-8")
        console.print(f"    [yellow]revise a prova em: acervo/revisao/{target.name}[/yellow]")


def cmd_ingest(args, settings: Settings) -> int:
    from cacd_factory.extractors import FileExtractor

    manifest_path = Path(args.manifest)
    if not manifest_path.exists():
        console.print("[red]Manifesto não encontrado.[/red] Solte os arquivos em acervo/entrada e rode o scan antes.")
        return 1
    manifest = load_manifest(manifest_path)
    store = SupabaseStore.from_settings(settings)
    if not args.dry_run and not store.has_acervo_tables():
        console.print(f"[red]Antes da primeira gravação, aplique {MIGRATION_HINT} no SQL Editor do Supabase.[/red]")
        return 1

    embed = None
    if args.com_vetores and not args.dry_run:
        from cacd_factory.gemini import embed_documents

        client = gemini_client(settings)

        def embed(texts, title):
            return embed_documents(client, texts, title=title)

    needle = (args.only or "").casefold()
    selected = [
        document
        for document in manifest.documents
        if not needle or needle in document.path.casefold() or needle in document.title.casefold()
    ]
    if not selected:
        console.print("Nenhum documento do manifesto corresponde à seleção.")
        return 1

    def resolve(stored: str) -> Path:
        return manifest.resolve(stored, manifest_path.parent)

    # Confere tudo antes de processar qualquer arquivo: erro de manifesto não pode sair pela metade.
    subjects, topics_by_subject, problems = {}, {}, []
    for document in selected:
        if document.subject not in subjects:
            subjects[document.subject] = store.get_subject(document.subject)
            topics_by_subject[document.subject] = store.get_topics(subjects[document.subject].id)
        codes = {document.topic, *(entry.topic for entry in document.topic_pages)} - {None}
        unknown = sorted(codes - topics_by_subject[document.subject].keys())
        if unknown:
            problems.append(f"{document.path}: tópico(s) inexistente(s) em {document.subject}: {', '.join(unknown)}")
        if not resolve(document.path).is_file():
            problems.append(f"{document.path}: arquivo não encontrado em {resolve(document.path)}")
        if document.answer_key and not resolve(document.answer_key).is_file():
            problems.append(f"{document.path}: gabarito não encontrado em {resolve(document.answer_key)}")
    if problems:
        console.print("[red]Corrija o manifesto antes de continuar:[/red]")
        for problem in problems:
            console.print(f"  • {problem}")
        return 1

    extractor = FileExtractor(
        whisper_model=settings.whisper_model,
        whisper_device=settings.whisper_device,
        resolve=resolve,
        log=lambda message: console.print(f"    [dim]{message}[/dim]"),
    )
    failures = 0
    for number, document in enumerate(selected, start=1):
        console.print(f"[bold]({number}/{len(selected)}) {document.title}[/bold] [dim]{document.path}[/dim]")
        try:
            result = ingest_document(
                doc=document,
                file_path=resolve(document.path),
                subject=subjects[document.subject],
                topics=topics_by_subject[document.subject],
                store=store,
                extract=extractor,
                embed=embed,
                reprocess=args.reprocess,
                dry_run=args.dry_run,
                answer_key_hash=file_sha256(resolve(document.answer_key)) if document.answer_key else None,
            )
        except Exception as error:
            failures += 1
            console.print(f"  [red]✗ {type(error).__name__}: {error}[/red]")
            if args.verbose:
                console.print(traceback.format_exc())
            continue
        report_ingest(result)
        write_outputs(document.title, result, Path(args.acervo))
    if failures:
        console.print(f"[red]{failures} arquivo(s) com erro; os demais foram processados.[/red] Rode com --verbose para detalhes.")
    return 1 if failures else 0


# --- fase de IA: busca e síntese ------------------------------------------------------


def cmd_search(args, settings: Settings) -> int:
    from cacd_factory.gemini import embed_query
    from cacd_factory.synthesis import strip_context_header

    store = SupabaseStore.from_settings(settings)
    client = gemini_client(settings)
    subject = store.get_subject(args.subject)
    topic_id = None
    if args.topic:
        topics = store.get_topics(subject.id)
        if args.topic not in topics:
            console.print(f"[red]Tópico {args.topic} não existe em {subject.name}.[/red]")
            return 1
        topic_id = topics[args.topic].id
    rows = store.hybrid_search(
        query_text=args.query,
        query_embedding=embed_query(client, args.query),
        subject_id=subject.id,
        topic_id=topic_id,
        match_count=args.k,
    )
    if not rows:
        console.print("Nenhum trecho encontrado.")
        return 0
    for rank, row in enumerate(rows, start=1):
        snippet = " ".join(strip_context_header(row["content"]).split())[:280]
        console.print(f"[bold]{rank}.[/bold] {row['citation_label']} [dim](rrf {float(row['rrf_score']):.4f})[/dim]")
        console.print(f"   {snippet}…")
    return 0


def report_synthesis(result: SynthesisResult) -> None:
    if result.status == "saved":
        console.print(f"  [green]✓ ficha gravada com {len(result.blocks)} blocos do acervo[/green]")
    elif result.status == "exists":
        console.print("  = já tem ficha (use --force para gerar de novo)")
    elif result.status == "insufficient":
        console.print(f"  [yellow]! acervo insuficiente ({len(result.blocks)} bloco(s) recuperado(s)); nada gravado[/yellow]")
    elif result.status == "invalid":
        console.print("  [red]✗ ficha recusada: as citações não conferem com os blocos; nada gravado[/red]")
        for error in result.errors[:6]:
            console.print(f"    • {error}")
    else:
        console.print(f"  ~ simulação: {len(result.blocks)} blocos seriam enviados ao modelo")
        for block in result.blocks:
            console.print(f"    [dim][{block.number}] {block.citation_label}[/dim]")
    for gap in result.gaps:
        console.print(f"    [yellow]não coberto: {gap}[/yellow]")


def cmd_synthesize(args, settings: Settings) -> int:
    from cacd_factory.gemini import embed_query, generate_structured
    from cacd_factory.synthesis import MAX_SOURCE_BLOCKS, LessonPackage, merge_retrieved

    if not args.all and not args.codes:
        console.print("[red]Informe os códigos dos tópicos (ex.: 3.3 2.4) ou use --all.[/red]")
        return 1
    store = SupabaseStore.from_settings(settings)
    client = gemini_client(settings)
    subject = store.get_subject(args.subject)
    topics = store.get_topics(subject.id)
    unknown = [code for code in args.codes if code not in topics]
    if unknown:
        console.print(f"[red]Tópico(s) inexistente(s) em {subject.name}: {', '.join(unknown)}[/red]")
        return 1
    selected = list(topics.values()) if args.all else [topics[code] for code in args.codes]

    def retrieve(topic):
        vector = embed_query(client, topic.title)
        search = dict(query_text=topic.title, query_embedding=vector, subject_id=subject.id, match_count=RETRIEVAL_PER_SEARCH)
        return merge_retrieved(
            store.hybrid_search(**search, topic_id=topic.id),
            store.hybrid_search(**search, topic_id=None),
            limit=MAX_SOURCE_BLOCKS,
        )

    def generate(system_prompt, user_prompt):
        return generate_structured(
            client, model=settings.synthesis_model, system_prompt=system_prompt, user_prompt=user_prompt, schema=LessonPackage
        )

    failures = 0
    for topic in selected:
        console.print(f"[bold]{topic.code}[/bold] {topic.title}")
        try:
            result = synthesize_topic(
                topic=topic, subject=subject, store=store, retrieve=retrieve, generate=generate, force=args.force, dry_run=args.dry_run
            )
        except Exception as error:
            failures += 1
            console.print(f"  [red]✗ {type(error).__name__}: {error}[/red]")
            if args.verbose:
                console.print(traceback.format_exc())
            continue
        report_synthesis(result)
    return 1 if failures else 0


# --- entrada ----------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="content_factory.py", description="Fábrica de conteúdo do CACD.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="caminho do bibliography_manifest.json")
    parser.add_argument("--subject", default="economia", help="slug da disciplina (padrão: economia)")
    parser.add_argument("--verbose", action="store_true", help="mostra o traceback completo dos erros")
    parser.add_argument("--acervo", default=str(ACERVO_DIR), help="pasta do acervo (entrada, processado, revisao)")
    commands = parser.add_subparsers(dest="command", required=True)

    status = commands.add_parser("status", help="situação do banco, do acervo e das fichas")
    status.set_defaults(handler=cmd_status)

    scan = commands.add_parser("scan", help="acrescenta ao manifesto os arquivos novos (padrão: acervo/entrada)")
    scan.add_argument("folder", nargs="?", help="outra pasta, se não for a acervo/entrada")
    scan.set_defaults(handler=cmd_scan)

    ingest = commands.add_parser("ingest", help="extrai e grava no banco o que está no manifesto")
    ingest.add_argument("--only", help="processa só os documentos cujo caminho ou título contém este texto")
    ingest.add_argument("--dry-run", action="store_true", help="extrai e mostra o resultado, sem gravar")
    ingest.add_argument("--reprocess", action="store_true", help="refaz mesmo o que já está no acervo")
    ingest.add_argument("--com-vetores", action="store_true", help="fase de IA: também vetoriza os trechos (Gemini)")
    ingest.set_defaults(handler=cmd_ingest)

    search = commands.add_parser("search", help="fase de IA: testa a busca híbrida do RAG")
    search.add_argument("query", help="pergunta ou termos de busca")
    search.add_argument("--topic", help="restringe a um tópico (ex.: 3.3)")
    search.add_argument("-k", type=int, default=8, help="quantidade de trechos (padrão: 8)")
    search.set_defaults(handler=cmd_search)

    synthesize = commands.add_parser("synthesize", help="fase de IA: gera a ficha em duas camadas")
    synthesize.add_argument("codes", nargs="*", help="códigos dos tópicos (ex.: 3.3 2.4)")
    synthesize.add_argument("--all", action="store_true", help="todos os tópicos da disciplina, na ordem da trilha")
    synthesize.add_argument("--force", action="store_true", help="gera de novo mesmo quando já existe ficha")
    synthesize.add_argument("--dry-run", action="store_true", help="mostra os blocos recuperados sem chamar o modelo")
    synthesize.set_defaults(handler=cmd_synthesize)
    return parser


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args, load_settings())
    except (ConfigError, LookupError) as error:
        console.print(f"[red]{error}[/red]")
        return 2


if __name__ == "__main__":
    sys.exit(main())
