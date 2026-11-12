import os
import json
import glob
import math
from pathlib import Path
from typing import List, Literal, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from rich.console import Console
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
# 0. EMBEDDINGS
# ============================================================================
# O antigo `text-embedding-004` produz apenas 768 dimensões e foi descontinuado.
# O parâmetro `output_dimensionality` usa Matryoshka para TRUNCAR para baixo,
# nunca para expandir: pedir 1536 dele falha contra a coluna `vector(1536)`.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 1536


def normalize_l2(vector: List[float]) -> List[float]:
    """Normaliza o vetor para norma L2 = 1.

    O `gemini-embedding-001` só entrega vetores pré-normalizados em 3072
    dimensões. Em 1536 a normalização é responsabilidade do cliente, e sem ela a
    distância de cosseno do pgvector fica distorcida — o RAG degrada em
    silêncio, sem levantar erro nenhum.
    """
    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0:
        raise ValueError("Embedding degenerado: vetor de norma zero.")
    return [value / magnitude for value in vector]


def embed_text(text: str) -> List[float]:
    """Gera o embedding normalizado de um texto, pronto para gravar no pgvector."""
    response = ai_client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIMENSIONS)
    )
    values = response.embeddings[0].values
    if len(values) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Dimensão inesperada: a coluna do banco espera {EMBEDDING_DIMENSIONS}, "
            f"o modelo devolveu {len(values)}."
        )
    return normalize_l2(values)

# ============================================================================
# 1. CONTRATOS PYDANTIC PARA GERAÇÃO ESTRUTURADA (BACK-OFFICE FACTORY)
# ============================================================================

class TPSTrapSchema(BaseModel):
    wrong_claim: str = Field(description="Afirmação falsa típica de prova que induz ao erro")
    truth_mechanism: str = Field(description="Explicação técnica da causalidade correta")
    trap_category: str = Field(description="Ex: Inversão Causal, Confusão Real vs Nominal, Troca Histórica")

class EssayRepertoireSchema(BaseModel):
    author_or_source: str = Field(description="Ex: Celso Furtado, Marcelo de Paiva Abreu, Giambiagi")
    core_thesis: str = Field(description="Tese central resumida para uso em discursiva de 3ª Fase")
    historical_data_or_milestone: str = Field(description="Dado histórico, decreto, plano ou indicador concreto")

class FlashcardSeedSchema(BaseModel):
    front_prompt: str = Field(description="Pergunta ativa focada em mecanismo causal ou distinção conceitual")
    back_answer: str = Field(description="Resposta objetiva e precisa baseada nas fontes")

class TPSGeneratedItemSchema(BaseModel):
    statement: str = Field(description="Assertiva no estilo Cebraspe/IADES para julgar Certo ou Errado")
    official_answer: Literal["C", "E"]
    detailed_explanation_md: str = Field(description="Justificativa detalhada citando o mecanismo e a fonte")
    trap_category: str

class TopicContentPackageSchema(BaseModel):
    base_intuition_md: str = Field(description="Explicação didática Base Zero em Markdown para construir fundação")
    cacd_deep_dive_md: str = Field(description="Aprofundamento técnico CACD em Markdown com modelos e historiografia")
    tps_traps: List[TPSTrapSchema]
    essay_repertoire: List[EssayRepertoireSchema]
    initial_flashcards: List[FlashcardSeedSchema]
    generated_tps_items: List[TPSGeneratedItemSchema]

# ============================================================================
# 2. EXTRATORES DE ARQUIVOS (PDF VIA DOCLING, VÍDEO VIA WHISPER, NOTAS MD)
# ============================================================================

def extract_text_from_pdf(pdf_path: str) -> List[dict]:
    """Extrai texto de PDF preservando tabelas e seções usando Docling."""
    from docling.document_converter import DocumentConverter
    console.print(f"[cyan]Extraindo PDF com Docling:[/cyan] {pdf_path}")
    converter = DocumentConverter()
    result = converter.convert(pdf_path)
    full_md = result.document.export_to_markdown()
    return chunk_markdown_by_sections(full_md, source_label=Path(pdf_path).stem)

def transcribe_video_or_audio(media_path: str) -> List[dict]:
    """Transcreve videoaulas localmente com Faster-Whisper preservando minutagem."""
    from faster_whisper import WhisperModel
    console.print(f"[cyan]Transcrevendo aula com Whisper:[/cyan] {media_path}")
    model = WhisperModel("large-v3", device="auto", compute_type="float16")
    segments, _ = model.transcribe(media_path, language="pt", beam_size=5)

    chunks = []
    buffer_text = []
    start_ts = 0.0

    for seg in segments:
        if not buffer_text:
            start_ts = seg.start
        buffer_text.append(seg.text.strip())
        if sum(len(t) for t in buffer_text) >= 1400:
            end_ts = seg.end
            citation = f"Minutagem {int(start_ts//60):02d}:{int(start_ts%60):02d} a {int(end_ts//60):02d}:{int(end_ts%60):02d}"
            chunks.append({"text": " ".join(buffer_text), "citation": citation})
            buffer_text = []

    if buffer_text:
        chunks.append({"text": " ".join(buffer_text), "citation": f"A partir de {int(start_ts//60):02d}:{int(start_ts%60):02d}"})
    return chunks

def chunk_markdown_by_sections(md_text: str, source_label: str, max_chars: int = 1600) -> List[dict]:
    """Divide textos Markdown/Notas mantendo cabeçalhos de seção como referência."""
    paragraphs = md_text.split("\n\n")
    chunks = []
    current_chunk = []
    current_heading = "Seção Geral"

    for p in paragraphs:
        p_strip = p.strip()
        if not p_strip:
            continue
        if p_strip.startswith("#"):
            current_heading = p_strip.lstrip("#").strip()
        current_chunk.append(p_strip)
        if sum(len(x) for x in current_chunk) >= max_chars:
            chunks.append({
                "text": "\n\n".join(current_chunk),
                "citation": f"{current_heading}"
            })
            current_chunk = []

    if current_chunk:
        chunks.append({
            "text": "\n\n".join(current_chunk),
            "citation": f"{current_heading}"
        })
    return chunks

# ============================================================================
# 3. VETORIZAÇÃO CONTEXTUAL E PERSISTÊNCIA NO SUPABASE
# ============================================================================

def register_and_index_source(
    subject_slug: str,
    topic_code: str,
    title: str,
    author: str,
    doc_type: Literal["book", "course_pdf", "video_transcript", "personal_note", "past_exam"],
    authority_weight: int,
    raw_chunks: List[dict]
) -> str:
    """Registra o documento e salva os chunks vetorizados com cabeçalho contextual."""
    subj = supabase.table("subjects").select("id, name").eq("slug", subject_slug).single().execute().data
    topic = supabase.table("topics").select("id, title").eq("code", topic_code).single().execute().data

    doc_insert = supabase.table("source_documents").insert({
        "subject_id": subj["id"],
        "title": title,
        "author": author,
        "doc_type": doc_type,
        "authority_weight": authority_weight
    }).execute()
    source_doc_id = doc_insert.data[0]["id"]

    console.print(f"[green]Vetorizando {len(raw_chunks)} blocos para:[/green] {title}")
    for idx, ch in enumerate(raw_chunks):
        contextual_content = (
            f"[Disciplina: {subj['name']} | Tópico {topic_code}: {topic['title']} | "
            f"Fonte: {title} ({author}) - {ch['citation']}]\n{ch['text']}"
        )

        embedding_vector = embed_text(contextual_content)

        supabase.table("document_chunks").insert({
            "source_document_id": source_doc_id,
            "topic_id": topic["id"],
            "chunk_index": idx,
            "content": contextual_content,
            "citation_label": f"{author} - {title} ({ch['citation']})",
            "embedding": embedding_vector
        }).execute()

    return topic["id"]

# ============================================================================
# 4. SÍNTESE DO PACOTE DE ESTUDO DO TÓPICO (AULA DUPLA + QUESTÕES + FLASHCARDS)
# ============================================================================

def synthesize_topic_package(topic_code: str):
    """Lê todos os chunks confiáveis de um tópico e gera a aula dupla, itens TPS e flashcards."""
    topic = supabase.table("topics").select("id, title, official_edital_ref").eq("code", topic_code).single().execute().data
    chunks = supabase.table("document_chunks").select("content, citation_label").eq("topic_id", topic["id"]).limit(40).execute().data

    if not chunks:
        console.print(f"[yellow]Nenhum chunk encontrado para o tópico {topic_code}.[/yellow]")
        return

    compiled_corpus = "\n\n---\n\n".join(
        [f"FONTE ({c['citation_label']}):\n{c['content']}" for c in chunks]
    )

    system_prompt = """
    Você é um professor catedrático de Economia preparatório para o Instituto Rio Branco (CACD).
    Sua missão é processar exclusivamente o acervo confiável abaixo e estruturar o estudo do tópico:
    1. Em `base_intuition_md`: construa a base desde o zero. Explique a intuição econômica, variáveis, eixos dos gráficos e relações de causa e efeito em linguagem clara, passo a passo, sem pular etapas lógicas.
    2. Em `cacd_deep_dive_md`: aprofunde no nível de 1ª e 3ª Fase do CACD, detalhando equações intuitivas, mecanismos de transmissão, exceções teóricas e o debate entre os autores presentes no acervo.
    3. Sempre referencie os autores e obras fornecidos no acervo.
    """

    console.print(f"[magenta]Sintetizando pacote pedagógico com Gemini 2.5 Pro para {topic_code}...[/magenta]")
    response = ai_client.models.generate_content(
        model="gemini-2.5-pro",
        contents=f"Tópico: {topic_code} - {topic['title']} ({topic['official_edital_ref']})\n\nACERVO:\n{compiled_corpus}",
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
            response_schema=TopicContentPackageSchema,
            temperature=0.15
        )
    )

    pkg: TopicContentPackageSchema = response.parsed

    # Salva a ficha dupla do tópico
    supabase.table("topic_lessons").upsert({
        "topic_id": topic["id"],
        "base_intuition_md": pkg.base_intuition_md,
        "cacd_deep_dive_md": pkg.cacd_deep_dive_md,
        "tps_traps_json": [t.model_dump() for t in pkg.tps_traps],
        "essay_repertoire_json": [r.model_dump() for r in pkg.essay_repertoire]
    }, on_conflict="topic_id").execute()

    # Salva os flashcards iniciais FSRS
    if pkg.initial_flashcards:
        supabase.table("flashcards").insert([
            {
                "topic_id": topic["id"],
                "origin": "pre_processed",
                "front_prompt": fc.front_prompt,
                "back_answer": fc.back_answer
            }
            for fc in pkg.initial_flashcards
        ]).execute()

    # Salva itens inéditos de TPS (Certo/Errado)
    if pkg.generated_tps_items:
        subj = supabase.table("subjects").select("id").eq("slug", "economia").single().execute().data
        stem = supabase.table("tps_question_stems").insert({
            "subject_id": subj["id"],
            "is_ai_generated": True,
            "stem_text": f"Acerca de {topic['title']}, julgue os itens a seguir em Certo (C) ou Errado (E)."
        }).execute().data[0]

        supabase.table("tps_items").insert([
            {
                "stem_id": stem["id"],
                "topic_id": topic["id"],
                "item_number": i + 1,
                "statement": item.statement,
                "official_answer": item.official_answer,
                "detailed_explanation_md": item.detailed_explanation_md,
                "trap_category": item.trap_category
            }
            for i, item in enumerate(pkg.generated_tps_items)
        ]).execute()

    console.print(f"[bold green]Pacote do tópico {topic_code} salvo com sucesso![/bold green]")

if __name__ == "__main__":
    console.print("[bold blue]Pipeline de Ingestão CACD pronto para execução.[/bold blue]")