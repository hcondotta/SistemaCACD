"""Orquestração da fábrica: ingestão idempotente do acervo e síntese que nunca grava ficha sem fonte.

A ingestão não depende de IA: o arquivo vira seções legíveis, figuras/slides e trechos para a busca
por palavras. O vetor de cada trecho é opcional (`embed=None`) e fica para a fase de IA.
As dependências externas (extratores, Gemini, Supabase) entram injetadas, para testar sem rede.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Protocol

from .chunking import ChunkRecord, build_chunk_records
from .domain import SubjectInfo, TopicInfo
from .exams import ExamDraft
from .manifest import ManifestDocument
from .sections import Section, section_blocks
from .synthesis import (
    SYSTEM_PROMPT,
    LessonPackage,
    SourceBlock,
    build_rows,
    build_user_prompt,
    has_enough_sources,
    to_source_blocks,
    validate_package,
)

# Suba este número quando mudar a extração ou o corte dos trechos: tudo é reprocessado.
CHUNKING_VERSION = 2
# Cada linha pode levar 1536 floats (~35 KB em JSON); 20 por requisição fica bem abaixo dos limites do PostgREST.
CHUNK_WRITE_BATCH = 20


@dataclass(frozen=True)
class AssetFile:
    """Imagem extraída (figura de livro, slide de aula) que vai para o Storage."""

    key: str
    kind: Literal["figure", "table", "slide"]
    data: bytes
    content_type: str
    width: int
    height: int
    page: int | None = None
    at_seconds: float | None = None
    caption: str | None = None


@dataclass
class Extraction:
    sections: list[Section]
    assets: list[AssetFile] = field(default_factory=list)
    exam: ExamDraft | None = None
    stats: dict = field(default_factory=dict)
    review_md: str | None = None  # provas: arquivo para ela conferir a extração


Extractor = Callable[[Path, ManifestDocument], Extraction]
Embedder = Callable[[list[str], "str | None"], list[list[float]]]


class IngestStore(Protocol):
    def find_document(self, content_hash: str, file_path: str) -> dict | None: ...

    def save_document(self, record: dict, existing_id: str | None = None) -> str: ...

    def manual_topics(self, document_id: str) -> dict[tuple[int, str], str]: ...

    def replace_sections(self, document_id: str, rows: list[dict]) -> dict[int, str]: ...

    def replace_assets(self, document_id: str, assets: list[dict]) -> None: ...

    def upsert_chunks(self, document_id: str, rows: list[dict]) -> None: ...

    def delete_chunks_from(self, document_id: str, first_stale_index: int) -> None: ...

    def import_exam(self, document_id: str, exam: ExamDraft, subject: SubjectInfo, **details) -> dict: ...

    def mark_processed(self, document_id: str, metadata: dict) -> None: ...


class SynthesisStore(Protocol):
    def lesson_exists(self, topic_id: str) -> bool: ...

    def replace_generated_content(self, **payload) -> None: ...


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def entry_fingerprint(document: ManifestDocument, answer_key_hash: str | None = None) -> str:
    """Muda quando muda o que altera o resultado: entrada do manifesto, gabarito ou versão do corte."""
    relevant = document.model_dump(mode="json", exclude={"path"})
    relevant["chunking_version"] = CHUNKING_VERSION
    relevant["answer_key_hash"] = answer_key_hash
    encoded = json.dumps(relevant, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


@dataclass
class IngestResult:
    status: Literal["ingested", "skipped", "duplicate", "dry_run", "empty"]
    document_id: str | None = None
    chunk_count: int = 0
    section_count: int = 0
    asset_count: int = 0
    records: list[ChunkRecord] = field(default_factory=list)
    duplicate_of: str | None = None
    exam_counts: dict = field(default_factory=dict)
    sections: list[Section] = field(default_factory=list)
    review_md: str | None = None


def _section_topics(
    sections: list[Section],
    doc: ManifestDocument,
    topics: Mapping[str, TopicInfo],
    manual: Mapping[tuple[int, str], str],
) -> dict[int, tuple[TopicInfo | None, str]]:
    """Tópico de cada seção: o escolhido à mão na interface vence; senão vale o manifesto."""
    by_id = {topic.id: topic for topic in topics.values()}
    resolved: dict[int, tuple[TopicInfo | None, str]] = {}
    for section in sections:
        manual_id = manual.get((section.position, section.title))
        if manual_id is not None and manual_id in by_id:
            resolved[section.position] = (by_id[manual_id], "manual")
            continue
        code = doc.topic_for_pages(section.pages)
        if code is not None and code not in topics:
            raise ValueError(f"O tópico {code!r} indicado para {doc.path!r} não existe na disciplina {doc.subject!r}.")
        resolved[section.position] = (topics[code] if code else None, "manifest")
    return resolved


def ingest_document(
    *,
    doc: ManifestDocument,
    file_path: Path,
    subject: SubjectInfo,
    topics: Mapping[str, TopicInfo],
    store: IngestStore,
    extract: Extractor,
    embed: Embedder | None = None,
    reprocess: bool = False,
    dry_run: bool = False,
    answer_key_hash: str | None = None,
) -> IngestResult:
    content_hash = file_sha256(file_path)
    fingerprint = entry_fingerprint(doc, answer_key_hash)
    stored_path = doc.normalized_path
    existing = store.find_document(content_hash, stored_path)

    # Mesmo arquivo listado em outro caminho: indexar de novo duplicaria o acervo inteiro.
    if existing and existing["content_hash"] == content_hash and existing["file_path"] != stored_path:
        return IngestResult(status="duplicate", document_id=existing["id"], duplicate_of=existing["file_path"])

    metadata = (existing.get("metadata") or {}) if existing else {}
    up_to_date = bool(
        existing
        and existing.get("processed_at")
        and existing["content_hash"] == content_hash
        and metadata.get("manifest_fingerprint") == fingerprint
    )
    if up_to_date and not reprocess:
        return IngestResult(
            status="skipped",
            document_id=existing["id"],
            chunk_count=int(metadata.get("chunk_count", 0)),
            section_count=int(metadata.get("section_count", 0)),
        )

    extraction = extract(file_path, doc)
    manual = store.manual_topics(existing["id"]) if existing else {}
    section_topics = _section_topics(extraction.sections, doc, topics, manual)

    def topic_code(block) -> str | None:
        topic, _ = section_topics[block.section_position]
        return topic.code if topic else None

    blocks = [block for section in extraction.sections for block in section_blocks(section)]
    records = build_chunk_records(doc, blocks, subject_name=subject.name, topics=topics, topic_for_block=topic_code)
    extracted = {"sections": extraction.sections, "review_md": extraction.review_md}
    if not records:
        return IngestResult(status="empty", **extracted)
    counts = {"section_count": len(extraction.sections), "asset_count": len(extraction.assets)}
    if dry_run:
        return IngestResult(status="dry_run", chunk_count=len(records), records=records, **counts, **extracted)

    # Vetores são opcionais e vêm antes de gravar: se a API cair no meio, o banco não fica com meio livro.
    vectors: list[list[float] | None] = [None] * len(records)
    if embed is not None:
        vectors = list(embed([record.content for record in records], doc.title))
        if len(vectors) != len(records):
            raise ValueError(f"Recebidos {len(vectors)} vetores para {len(records)} trechos de {doc.path!r}.")

    document_id = store.save_document(
        {
            "subject_id": subject.id,
            "title": doc.title,
            "author": doc.author,
            "doc_type": doc.doc_type,
            "file_path": stored_path,
            "authority_weight": doc.authority_weight,
            "content_hash": content_hash,
            "metadata": {"manifest_fingerprint": fingerprint, "edition": doc.edition, **extraction.stats},
        },
        existing_id=existing["id"] if existing else None,
    )

    section_ids = store.replace_sections(
        document_id,
        [
            {
                "position": section.position,
                "level": section.level,
                "title": section.title,
                "heading_path": list(section.heading_path),
                "content_md": section.content_md,
                "page_start": section.page_start,
                "page_end": section.page_end,
                "start_seconds": section.start_seconds,
                "end_seconds": section.end_seconds,
                "topic_id": section_topics[section.position][0].id if section_topics[section.position][0] else None,
                "topic_assigned_by": section_topics[section.position][1],
                "word_count": section.word_count,
            }
            for section in extraction.sections
        ],
    )

    owner = {key: section.position for section in extraction.sections for key in section.asset_keys}
    store.replace_assets(
        document_id,
        [
            {
                "key": asset.key,
                "kind": asset.kind,
                "position": position,
                "page": asset.page,
                "at_seconds": asset.at_seconds,
                "caption": asset.caption,
                "width": asset.width,
                "height": asset.height,
                "content_type": asset.content_type,
                "data": asset.data,
                "section_position": owner.get(asset.key),
                "section_id": section_ids.get(owner[asset.key]) if asset.key in owner else None,
            }
            for position, asset in enumerate(extraction.assets)
        ],
    )

    rows = [
        {
            "source_document_id": document_id,
            "chunk_index": record.chunk_index,
            "topic_id": record.topic_id,
            "content": record.content,
            "citation_label": record.citation_label,
            "embedding": vector,
            "metadata": record.metadata,
        }
        for record, vector in zip(records, vectors)
    ]
    for start in range(0, len(rows), CHUNK_WRITE_BATCH):
        store.upsert_chunks(document_id, rows[start : start + CHUNK_WRITE_BATCH])
    # Uma versão nova com menos trechos não pode deixar os antigos sobrando na busca.
    store.delete_chunks_from(document_id, len(rows))

    exam_counts = (
        store.import_exam(
            document_id,
            extraction.exam,
            subject,
            year=extraction.stats.get("year"),
            board=extraction.stats.get("board"),
            title=doc.title,
        )
        if extraction.exam
        else {}
    )
    store.mark_processed(document_id, {"chunk_count": len(rows), **counts, **({"exam": exam_counts} if exam_counts else {})})
    return IngestResult(
        status="ingested",
        document_id=document_id,
        chunk_count=len(rows),
        records=records,
        exam_counts=exam_counts,
        **counts,
        **extracted,
    )


@dataclass
class SynthesisResult:
    status: Literal["saved", "exists", "insufficient", "invalid", "dry_run"]
    blocks: list[SourceBlock] = field(default_factory=list)
    gaps: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def synthesize_topic(
    *,
    topic: TopicInfo,
    subject: SubjectInfo,
    store: SynthesisStore,
    retrieve: Callable[[TopicInfo], list[dict]],
    generate: Callable[[str, str], LessonPackage],
    force: bool = False,
    dry_run: bool = False,
) -> SynthesisResult:
    if not force and store.lesson_exists(topic.id):
        return SynthesisResult(status="exists")

    blocks = to_source_blocks(retrieve(topic))
    # Com menos blocos do que o mínimo, o modelo teria de completar de memória: nem chamamos.
    if not has_enough_sources(blocks):
        return SynthesisResult(status="insufficient", blocks=blocks)
    if dry_run:
        return SynthesisResult(status="dry_run", blocks=blocks)

    package = generate(SYSTEM_PROMPT, build_user_prompt(topic, blocks))
    if not package.acervo_suficiente:
        return SynthesisResult(status="insufficient", blocks=blocks, gaps=list(package.coverage_gaps))

    errors = validate_package(package, block_count=len(blocks))
    if errors:
        return SynthesisResult(status="invalid", blocks=blocks, errors=errors)

    store.replace_generated_content(topic=topic, subject=subject, **build_rows(package, blocks, topic=topic))
    return SynthesisResult(status="saved", blocks=blocks, gaps=list(package.coverage_gaps))
