import os
import json
import argparse
from pathlib import Path
from typing import List, Literal, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from rich.console import Console
from rich.progress import track
from google import genai
from google.genai import types
from supabase import create_client, Client

load_dotenv()
console = Console()

supabase: Client = create_client(
    os.environ["NEXT_PUBLIC_SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_ROLE_KEY"]
)
ai_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

# ============================================================================
# 1. CONTRATOS PYDANTIC PARA EXTRAÇÃO ESTRUTURADA DE PROVAS (1ª E 3ª FASES)
# ============================================================================

class ExtractedTPSItem(BaseModel):
    item_number: int = Field(description="Número do subitem dentro da questão (geralmente 1, 2, 3 ou 4)")
    statement: str = Field(description="Texto integral e literal da assertiva a ser julgada C ou E")
    official_answer: Literal["C", "E"] = Field(description="Gabarito definitivo oficial (C para Certo, E para Errado)")
    topic_code: str = Field(description="Código exato do tópico na árvore do sistema (ex: '3.1', '3.3', '4.7')")
    trap_category: str = Field(
        description="Categoria da armadilha da banca (ex: 'Inversão Causal', 'Confusão Real vs Nominal', 'Troca Cronológica', 'Conceito Correto')"
    )
    initial_explanation: str = Field(
        description="Explicação técnica preliminar do motivo pelo qual o item está Certo ou Errado"
    )

class ExtractedTPSQuestionStem(BaseModel):
    question_label: str = Field(description="Identificador da questão na prova (ex: 'Questão 42')")
    stem_text: str = Field(description="Texto introdutório/motivador que precede os 4 itens da questão")
    items: List[ExtractedTPSItem]

class TPSExamExtractionPackage(BaseModel):
    exam_year: int
    exam_board: str = Field(description="Banca examinadora (ex: 'Cebraspe' ou 'IADES')")
    questions: List[ExtractedTPSQuestionStem]

class GroundedTPSExplanation(BaseModel):
    detailed_explanation_md: str = Field(
        description="Gabarito comentado detalhado em Markdown, explicando a cadeia causal e citando explicitamente a fonte do acervo recuperada"
    )
    trap_category: str = Field(
        description="Classificação refinada da pegadinha da banca (ex: 'Inversão Causal no Modelo Mundell-Fleming')"
    )

class EssayCommandItem(BaseModel):
    item: str = Field(description="Letra ou identificador do subcomando (ex: 'a', 'b', 'c')")
    prompt: str = Field(description="Descrição exata do que a banca exige neste subcomando")
    max_points: float = Field(description="Pontuação máxima atribuída ao subcomando")

class EssayRubricCriterion(BaseModel):
    command_item: str = Field(description="Subcomando correspondente ('a', 'b', 'c')")
    mandatory_concepts: List[str] = Field(description="Conceitos econômicos e mecanismos causais obrigatórios")
    expected_authors_or_facts: List[str] = Field(description="Autores canônicos, planos econômicos, leis ou dados esperados")
    common_fatal_errors: List[str] = Field(description="Inversões causais ou anacronismos que zeram o subitem")

class ExtractedEssayPrompt(BaseModel):
    title: str = Field(description="Título temático conciso da questão discursiva")
    topic_code: str = Field(description="Código do tópico principal na árvore (ex: '3.3', '4.2', '4.7')")
    motivating_text: str = Field(description="Texto motivador integral da questão discursiva")
    min_lines: int = Field(default=60)
    max_lines: int = Field(default=90)
    max_score: float = Field(default=30.0)
    commands: List[EssayCommandItem]
    grading_rubric: List[EssayRubricCriterion]
    model_answer_md: str = Field(
        description="Dissertação-modelo padrão Instituto Rio Branco (70 a 85 linhas) que responde integralmente a todos os subcomandos"
    )

class EssayExamExtractionPackage(BaseModel):
    exam_year: int
    essays: List[ExtractedEssayPrompt]

# ============================================================================
# 2. UTILITÁRIOS DE LEITURA DE PDF E BUSCA VETORIAL (RAG GROUNDING)
# ============================================================================

def convert_pdf_to_markdown(pdf_path: str) -> str:
    """Converte o PDF da prova ou gabarito em Markdown estruturado usando Docling."""
    from docling.document_converter import DocumentConverter
    console.print(f"[cyan]Lendo PDF com Docling:[/cyan] {pdf_path}")
    converter = DocumentConverter()
    result = converter.convert(pdf_path)
    return result.document.export_to_markdown()

def get_subject_and_topics_catalog(subject_slug: str):
    """Carrega a lista oficial de tópicos do banco para orientar a classificação da IA."""
    subj = supabase.table("subjects").select("id, name").eq("slug", subject_slug).single().execute().data
    modules = supabase.table("modules").select("id, code, title").eq("subject_id", subj["id"]).execute().data
    mod_ids = [m["id"] for m in modules]

    topics = (
        supabase.table("topics")
        .select("id, code, title, official_edital_ref")
        .in_("module_id", mod_ids)
        .order("pedagogical_order")
        .execute()
        .data
    )

    topic_map = {t["code"]: t["id"] for t in topics}
    catalog_text = "\n".join(
        [f"- Código '{t['code']}': {t['title']} ({t['official_edital_ref']})" for t in topics]
    )
    return subj, topic_map, catalog_text

def find_best_rag_chunk_for_statement(
    statement_text: str,
    subject_id: str,
    topic_id: Optional[str]
) -> Optional[dict]:
    """Busca no PostgreSQL (hybrid_search_chunks) o trecho mais relevante do acervo confiável."""
    emb_res = ai_client.models.embed_content(
        model="text-embedding-004",
        contents=statement_text,
        config=types.EmbedContentConfig(output_dimensionality=1536)
    )
    query_vector = emb_res.embeddings[0].values

    rpc_res = supabase.rpc(
        "hybrid_search_chunks",
        {
            "query_text": statement_text,
            "query_embedding": query_vector,
            "filter_subject_id": subject_id,
            "filter_topic_id": topic_id,
            "match_count": 3,
        }
    ).execute()

    chunks = rpc_res.data or []
    return chunks[0] if chunks else None

# ============================================================================
# 3. IMPORTADOR DE PROVAS DE 1ª FASE (TPS — CERTO / ERRADO)
# ============================================================================

def import_tps_exam_pdf(
    pdf_path: str,
    gabarito_path: Optional[str],
    subject_slug: str,
    exam_year: int,
    exam_board: str,
    dry_run: bool = False
):
    subj, topic_map, catalog_text = get_subject_and_topics_catalog(subject_slug)
    exam_md = convert_pdf_to_markdown(pdf_path)
    gabarito_md = convert_pdf_to_markdown(gabarito_path) if gabarito_path else "Gabarito incluso no documento principal."

    system_instruction = f"""
    Você é um especialista em provas do Concurso de Admissão à Carreira de Diplomata (CACD - Instituto Rio Branco).
    Extraia TODAS as questões e subitens da disciplina de {subj['name']} presentes no documento fornecido.
    
    REGRAS OBRIGATÓRIAS:
    1. No CACD, cada questão do TPS possui um texto introdutório (`stem_text`) seguido de 4 assertivas (`items` numerados de 1 a 4) julgadas como Certo ('C') ou Errado ('E').
    2. Classifique cada um dos 4 subitens individualmente no `topic_code` mais específico da árvore abaixo (pois uma mesma questão do CACD frequentemente mistura subitens de tópicos distintos):
    {catalog_text}
    3. Use estritamente o gabarito definitivo oficial para preencher `official_answer` ('C' ou 'E').
    """

    console.print(f"[magenta]Extraindo questões TPS ({exam_year} - {exam_board}) com Gemini 2.5 Pro...[/magenta]")
    response = ai_client.models.generate_content(
        model="gemini-2.5-pro",
        contents=(
            f"ANO DA PROVA: {exam_year}\nBANCA: {exam_board}\n\n"
            f"--- TEXTO DA PROVA ---\n{exam_md}\n\n"
            f"--- GABARITO OFICIAL / COMENTÁRIOS ---\n{gabarito_md}"
        ),
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=TPSExamExtractionPackage,
            temperature=0.1,
        )
    )

    package: TPSExamExtractionPackage = response.parsed
    console.print(f"[green]Extraídas {len(package.questions)} questões completas do TPS {exam_year}.[/green]")

    if dry_run:
        console.print_json(data=package.model_dump())
        return

    fallback_topic_id = next(iter(topic_map.values()))

    for q in track(package.questions, description="Ancorando itens no RAG e salvando no Supabase..."):
        # 1. Insere o enunciado-base (tps_question_stems)
        stem_insert = supabase.table("tps_question_stems").insert({
            "subject_id": subj["id"],
            "exam_year": package.exam_year,
            "exam_board": package.exam_board,
            "is_ai_generated": False,
            "stem_text": f"[{q.question_label} - CACD {package.exam_year}] {q.stem_text}"
        }).execute()
        stem_id = stem_insert.data[0]["id"]

        # 2. Para cada um dos 4 itens, busca o chunk correspondente no acervo e enriquece a explicação
        for item in q.items:
            resolved_topic_id = topic_map.get(item.topic_code, fallback_topic_id)
            best_chunk = find_best_rag_chunk_for_statement(item.statement, subj["id"], resolved_topic_id)

            detailed_md = item.initial_explanation
            trap_cat = item.trap_category
            source_chunk_id = None

            if best_chunk:
                source_chunk_id = best_chunk["chunk_id"]
                grounding_res = ai_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=(
                        f"Assertiva CACD ({package.exam_year}): {item.statement}\n"
                        f"Gabarito Oficial: {item.official_answer}\n"
                        f"Explicação Preliminar: {item.initial_explanation}\n\n"
                        f"FONTE DO ACERVO CONFIÁVEL ({best_chunk['citation_label']}):\n{best_chunk['content']}"
                    ),
                    config=types.GenerateContentConfig(
                        system_instruction=(
                            "Escreva o gabarito comentado definitivo para a aluna. "
                            "Comece cravando por que o item está Certo ou Errado, mostre o mecanismo econômico passo a passo "
                            "e cite explicitamente a fonte do acervo fornecida."
                        ),
                        response_mime_type="application/json",
                        response_schema=GroundedTPSExplanation,
                        temperature=0.15,
                    )
                )
                grounded: GroundedTPSExplanation = grounding_res.parsed
                detailed_md = grounded.detailed_explanation_md
                trap_cat = grounded.trap_category

            supabase.table("tps_items").insert({
                "stem_id": stem_id,
                "topic_id": resolved_topic_id,
                "item_number": item.item_number,
                "statement": item.statement,
                "official_answer": item.official_answer,
                "detailed_explanation_md": detailed_md,
                "trap_category": trap_cat,
                "source_chunk_id": source_chunk_id,
            }).execute()

    console.print(f"[bold green]Prova TPS {exam_year} importada com sucesso em tps_question_stems e tps_items![/bold green]")

# ============================================================================
# 4. IMPORTADOR DE PROVAS DISCURSIVAS DE 3ª FASE (60 A 90 LINHAS)
# ============================================================================

def import_essay_exam_pdf(
    pdf_path: str,
    espelho_path: Optional[str],
    subject_slug: str,
    exam_year: int,
    dry_run: bool = False
):
    subj, topic_map, catalog_text = get_subject_and_topics_catalog(subject_slug)
    exam_md = convert_pdf_to_markdown(pdf_path)
    espelho_md = convert_pdf_to_markdown(espelho_path) if espelho_path else "Espelho incluso no documento ou deve ser estruturado a partir dos subcomandos."

    system_instruction = f"""
    Você é da Banca Examinadora de {subj['name']} da 3ª Fase do CACD (Instituto Rio Branco).
    Extraia todas as questões discursivas do documento fornecido, separando o texto motivador, os subcomandos com suas pontuações, o espelho de correção estruturado (`grading_rubric`) e uma resposta-modelo padrão de 75 a 85 linhas (`model_answer_md`).
    
    Vincule cada questão ao `topic_code` mais aderente da árvore abaixo:
    {catalog_text}
    """

    console.print(f"[magenta]Extraindo propostas discursivas da 3ª Fase ({exam_year}) com Gemini 2.5 Pro...[/magenta]")
    response = ai_client.models.generate_content(
        model="gemini-2.5-pro",
        contents=(
            f"ANO DA PROVA DISCURSIVA: {exam_year}\n\n"
            f"--- CADERNO DE PROVA 3ª FASE ---\n{exam_md}\n\n"
            f"--- ESPELHO DE CORREÇÃO / GUIA COMENTADO ---\n{espelho_md}"
        ),
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=EssayExamExtractionPackage,
            temperature=0.15,
        )
    )

    package: EssayExamExtractionPackage = response.parsed
    console.print(f"[green]Extraídas {len(package.essays)} questões discursivas de 3ª Fase ({exam_year}).[/green]")

    if dry_run:
        console.print_json(data=package.model_dump())
        return

    fallback_topic_id = next(iter(topic_map.values()))

    for essay in track(package.essays, description="Salvando temas e espelhos em essay_prompts..."):
        resolved_topic_id = topic_map.get(essay.topic_code, fallback_topic_id)

        supabase.table("essay_prompts").insert({
            "subject_id": subj["id"],
            "topic_id": resolved_topic_id,
            "exam_year": package.exam_year,
            "title": essay.title,
            "motivating_text": essay.motivating_text,
            "commands_json": [c.model_dump() for c in essay.commands],
            "min_lines": essay.min_lines,
            "max_lines": essay.max_lines,
            "max_score": essay.max_score,
            "grading_rubric_json": [r.model_dump() for r in essay.grading_rubric],
            "model_answer_md": essay.model_answer_md,
        }).execute()

    console.print(f"[bold green]Provas discursivas de {exam_year} salvas com sucesso em essay_prompts![/bold green]")

# ============================================================================
# 5. INTERFACE DE LINHA DE COMANDO (CLI)
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Importador de Provas Anteriores do CACD (1ª e 3ª Fases)")
    parser.add_argument("--mode", choices=["tps", "essay"], required=True, help="Tipo de prova: 'tps' (1ª Fase) ou 'essay' (3ª Fase)")
    parser.add_argument("--pdf", required=True, help="Caminho para o arquivo PDF da prova")
    parser.add_argument("--gabarito", default=None, help="Caminho opcional para o PDF do gabarito oficial ou espelho comentado")
    parser.add_argument("--subject", default="economia", help="Slug da disciplina no banco (default: economia)")
    parser.add_argument("--year", type=int, required=True, help="Ano da prova do CACD (ex: 2024)")
    parser.add_argument("--board", default="Cebraspe", help="Banca examinadora (ex: Cebraspe ou IADES)")
    parser.add_argument("--dry-run", action="store_true", help="Apenas extrai e exibe o JSON no terminal sem gravar no banco")

    args = parser.parse_args()

    if args.mode == "tps":
        import_tps_exam_pdf(
            pdf_path=args.pdf,
            gabarito_path=args.gabarito,
            subject_slug=args.subject,
            exam_year=args.year,
            exam_board=args.board,
            dry_run=args.dry_run,
        )
    else:
        import_essay_exam_pdf(
            pdf_path=args.pdf,
            espelho_path=args.gabarito,
            subject_slug=args.subject,
            exam_year=args.year,
            dry_run=args.dry_run,
        )