"""Síntese da ficha em duas camadas, ancorada no acervo e com citações verificadas.

Regra 1 do AGENTS.md (zero alucinação) aplicada às fichas: o modelo só recebe blocos numerados do
acervo, cita cada afirmação com [n] e lista em `coverage_gaps` o que o acervo não cobre. Antes de
gravar, `validate_package` confere que toda citação aponta para um bloco que existe.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field

from .domain import TopicInfo

MIN_SOURCE_BLOCKS = 3
MAX_SOURCE_BLOCKS = 20

# ---------------------------------------------------------------------------
# Contrato de saída pedido ao modelo
# ---------------------------------------------------------------------------


class TrapOut(BaseModel):
    wrong_claim: str = Field(description="Afirmação falsa típica de prova, que induz ao erro.")
    truth_mechanism: str = Field(description="O mecanismo correto, explicado a partir dos blocos.")
    trap_category: str = Field(description="Ex.: Inversão causal, Confusão real vs. nominal, Troca histórica.")
    source_blocks: list[int] = Field(description="Números dos blocos que sustentam a explicação.")


class RepertoireOut(BaseModel):
    author_or_source: str = Field(description="Autor, obra ou instituição que aparece nos blocos.")
    core_thesis: str = Field(description="Tese central, pronta para uso em discursiva de 3ª fase.")
    historical_data_or_milestone: str = Field(description="Dado, plano, lei ou marco histórico concreto dos blocos.")
    source_blocks: list[int] = Field(description="Números dos blocos de onde saiu o repertório.")


class FlashcardOut(BaseModel):
    front_prompt: str = Field(description="Pergunta ativa sobre mecanismo causal ou distinção conceitual.")
    back_answer: str = Field(description="Resposta objetiva e precisa, fiel aos blocos.")
    source_blocks: list[int] = Field(description="Números dos blocos que sustentam a resposta.")


class TpsItemOut(BaseModel):
    statement: str = Field(description="Assertiva para julgar Certo ou Errado, no estilo Cebraspe.")
    official_answer: Literal["C", "E"]
    detailed_explanation_md: str = Field(description="Justificativa em Markdown, citando os blocos com [n].")
    trap_category: str
    source_block: int = Field(description="Número do bloco principal que fundamenta o gabarito.")


class LessonPackage(BaseModel):
    acervo_suficiente: bool = Field(description="false se os blocos não cobrem o núcleo do tópico.")
    coverage_gaps: list[str] = Field(description="Pontos do tópico do edital que os blocos não cobrem.")
    base_intuition_md: str = Field(description="Camada 1, Intuição Base Zero, em Markdown, com citações [n].")
    cacd_deep_dive_md: str = Field(description="Camada 2, Rigor CACD, em Markdown, com citações [n].")
    tps_traps: list[TrapOut]
    essay_repertoire: list[RepertoireOut]
    initial_flashcards: list[FlashcardOut]
    generated_tps_items: list[TpsItemOut]


SYSTEM_PROMPT = """Você é professor de Economia de um curso preparatório de alto nível para o CACD (Instituto Rio Branco).
Você recebe blocos numerados do acervo da aluna e escreve a ficha do tópico usando EXCLUSIVAMENTE esses blocos.

Fundamentação (obrigatória):
1. Toda afirmação factual, conceito, mecanismo, dado, data ou autor sai dos blocos e leva a citação do bloco entre colchetes, como [3] ou [2, 5]. Não use outra forma de citação e nunca invente números de bloco.
2. Não complete com conhecimento próprio. Se um ponto do tópico do edital não está nos blocos, não o explique: liste-o em coverage_gaps.
3. Se os blocos não cobrem o núcleo do tópico, responda acervo_suficiente = false e deixe os demais campos curtos.

Camada 1 — base_intuition_md (Intuição Base Zero), para quem nunca estudou economia: comece pela intuição, com linguagem simples e um exemplo concreto. Explique o vocabulário, as variáveis, o que está em cada eixo dos gráficos e a cadeia de causa e efeito, passo a passo. Nada de formalismo no começo.
Camada 2 — cacd_deep_dive_md (Rigor CACD), no nível da prova (TPS e discursiva de 3ª fase): modelo formal, equações em texto simples (sem LaTeX), hipóteses, exceções, o debate entre os autores dos blocos e a conexão com a história econômica quando os blocos permitirem.
Use Markdown com subtítulos (##), listas e negrito com moderação. Escreva em português do Brasil.

tps_traps: armadilhas típicas da banca (afirmação errada, mecanismo correto e categoria), com os blocos de origem.
essay_repertoire: autores, obras, dados e marcos para a discursiva — somente os que aparecem nos blocos.
initial_flashcards: de 5 a 10 perguntas ativas, cada uma com resposta objetiva e os blocos de origem.
generated_tps_items: de 4 a 8 itens Certo/Errado no estilo Cebraspe, cada um com justificativa citando [n] e o bloco principal."""


# ---------------------------------------------------------------------------
# Blocos do acervo e citações
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SourceBlock:
    number: int
    chunk_id: str
    citation_label: str
    content: str


# [1], [2, 3], [4–6], [1-2; 5]; ignora links Markdown como [3](https://...).
_CITATION = re.compile(r"\[(\d+(?:\s*[-–]\s*\d+)?(?:\s*[,;]\s*\d+(?:\s*[-–]\s*\d+)?)*)\](?!\()")
_MAX_RANGE_SPAN = 50


def cited_numbers(markdown: str) -> set[int]:
    numbers: set[int] = set()
    for match in _CITATION.finditer(markdown):
        for part in re.split(r"\s*[,;]\s*", match.group(1)):
            bounds = [int(value) for value in re.split(r"\s*[-–]\s*", part)]
            if len(bounds) == 2 and bounds[0] <= bounds[1] and bounds[1] - bounds[0] <= _MAX_RANGE_SPAN:
                numbers.update(range(bounds[0], bounds[1] + 1))
            else:
                numbers.update(bounds)
    return numbers


def strip_context_header(content: str) -> str:
    """O cabeçalho [Disciplina | Tópico | Fonte] serve à busca; no prompt a fonte já vai no rótulo."""
    first_line, _, rest = content.partition("\n")
    if first_line.startswith("[Disciplina:") and first_line.endswith("]"):
        return rest.strip()
    return content.strip()


def merge_retrieved(*result_lists: Iterable[dict], limit: int = MAX_SOURCE_BLOCKS) -> list[dict]:
    """Junta as buscas sem repetir trecho; a primeira lista (a do tópico) tem prioridade."""
    seen: set[str] = set()
    merged: list[dict] = []
    for rows in result_lists:
        for row in rows:
            chunk_id = str(row["chunk_id"])
            if chunk_id in seen:
                continue
            seen.add(chunk_id)
            merged.append(row)
            if len(merged) >= limit:
                return merged
    return merged


def to_source_blocks(rows: Iterable[dict]) -> list[SourceBlock]:
    return [
        SourceBlock(
            number=number,
            chunk_id=str(row["chunk_id"]),
            citation_label=row["citation_label"],
            content=strip_context_header(row["content"]),
        )
        for number, row in enumerate(rows, start=1)
    ]


def has_enough_sources(blocks: Sequence[SourceBlock]) -> bool:
    return len(blocks) >= MIN_SOURCE_BLOCKS


def build_user_prompt(topic: TopicInfo, blocks: Sequence[SourceBlock]) -> str:
    header = f"Tópico {topic.code} — {topic.title}"
    if topic.official_edital_ref:
        header += f" ({topic.official_edital_ref})"
    numbered = "\n\n".join(f"[{block.number}] Fonte: {block.citation_label}\n{block.content}" for block in blocks)
    return f"{header}\n\nBLOCOS DO ACERVO (cite pelo número entre colchetes):\n\n{numbered}"


# ---------------------------------------------------------------------------
# Validação e renderização
# ---------------------------------------------------------------------------

_LAYERS = (("base_intuition_md", "Camada 1"), ("cacd_deep_dive_md", "Camada 2"))


def validate_package(package: LessonPackage, block_count: int) -> list[str]:
    valid = set(range(1, block_count + 1))
    errors: list[str] = []

    def outside(numbers: Iterable[int]) -> list[int]:
        return sorted(set(numbers) - valid)

    def describe(numbers: Iterable[int]) -> str:
        return ", ".join(f"[{number}]" for number in numbers)

    for field_name, label in _LAYERS:
        text = getattr(package, field_name).strip()
        if not text:
            errors.append(f"{field_name} ({label}): texto vazio.")
            continue
        cited = cited_numbers(text)
        if not cited:
            errors.append(f"{field_name} ({label}): nenhuma citação [n] aos blocos do acervo.")
        if outside(cited):
            errors.append(f"{field_name} ({label}): cita blocos inexistentes {describe(outside(cited))}.")

    sourced_lists = (
        ("tps_traps", package.tps_traps),
        ("essay_repertoire", package.essay_repertoire),
        ("initial_flashcards", package.initial_flashcards),
    )
    for list_name, items in sourced_lists:
        for position, item in enumerate(items, start=1):
            if not item.source_blocks:
                errors.append(f"{list_name} #{position}: sem bloco de origem.")
            elif outside(item.source_blocks):
                errors.append(f"{list_name} #{position}: blocos inexistentes {describe(outside(item.source_blocks))}.")

    for position, item in enumerate(package.generated_tps_items, start=1):
        if item.source_block not in valid:
            errors.append(f"generated_tps_items #{position}: bloco de origem [{item.source_block}] inexistente.")
        bad = outside(cited_numbers(item.detailed_explanation_md))
        if bad:
            errors.append(f"generated_tps_items #{position}: a justificativa cita blocos inexistentes {describe(bad)}.")
    return errors


def render_layer(markdown: str, blocks: Sequence[SourceBlock], gaps: Sequence[str]) -> str:
    """Acrescenta ao texto o que o acervo não cobre e a lista das fontes realmente citadas."""
    by_number = {block.number: block for block in blocks}
    cited = sorted(number for number in cited_numbers(markdown) if number in by_number)
    clean_gaps = [gap.strip() for gap in gaps if gap.strip()]
    sections = []
    if clean_gaps:
        sections.append("**Não coberto pelo acervo**\n\n" + "\n".join(f"- {gap}" for gap in clean_gaps))
    if cited:
        sections.append(
            "**Fontes do acervo**\n\n" + "\n".join(f"- [{number}] {by_number[number].citation_label}" for number in cited)
        )
    if not sections:
        return markdown.strip()
    return markdown.strip() + "\n\n---\n\n" + "\n\n".join(sections)


def _labels(numbers: Iterable[int], by_number: dict[int, SourceBlock]) -> list[str]:
    return [by_number[number].citation_label for number in sorted(set(numbers)) if number in by_number]


def build_rows(package: LessonPackage, blocks: Sequence[SourceBlock], *, topic: TopicInfo) -> dict:
    """Converte o pacote validado nas linhas de topic_lessons, flashcards e tps_items."""
    by_number = {block.number: block for block in blocks}
    gaps = list(package.coverage_gaps)
    lesson = {
        "topic_id": topic.id,
        "base_intuition_md": render_layer(package.base_intuition_md, blocks, gaps),
        "cacd_deep_dive_md": render_layer(package.cacd_deep_dive_md, blocks, gaps),
        "tps_traps_json": [
            {
                "wrong_claim": trap.wrong_claim,
                "truth_mechanism": trap.truth_mechanism,
                "trap_category": trap.trap_category,
                "sources": _labels(trap.source_blocks, by_number),
            }
            for trap in package.tps_traps
        ],
        "essay_repertoire_json": [
            {
                "author_or_source": item.author_or_source,
                "core_thesis": item.core_thesis,
                "historical_data_or_milestone": item.historical_data_or_milestone,
                "sources": _labels(item.source_blocks, by_number),
            }
            for item in package.essay_repertoire
        ],
    }
    flashcards = [
        {"topic_id": topic.id, "origin": "pre_processed", "front_prompt": card.front_prompt, "back_answer": card.back_answer}
        for card in package.initial_flashcards
    ]
    tps_items = [
        {
            "topic_id": topic.id,
            "item_number": position,
            "statement": item.statement,
            "official_answer": item.official_answer,
            "detailed_explanation_md": render_layer(item.detailed_explanation_md, blocks, gaps=[]),
            "trap_category": item.trap_category,
            "source_chunk_id": by_number[item.source_block].chunk_id,
        }
        for position, item in enumerate(package.generated_tps_items, start=1)
    ]
    stem_text = f"Acerca de {topic.title}, julgue os itens a seguir em Certo (C) ou Errado (E)."
    return {"lesson": lesson, "flashcards": flashcards, "tps_items": tps_items, "stem_text": stem_text}


# ---------------------------------------------------------------------------
# Regeneração sem apagar o histórico de estudo
# ---------------------------------------------------------------------------


def flashcards_to_replace(existing: Iterable[dict]) -> list[str]:
    """Só sai o card gerado pela fábrica que ela nunca revisou; o histórico do FSRS fica."""
    return [
        str(card["id"])
        for card in existing
        if card.get("origin") == "pre_processed" and int(card.get("reps") or 0) == 0
    ]


def tps_items_to_replace(items: Iterable[dict], *, ai_stem_ids: set[str], attempted_item_ids: set[str]) -> list[str]:
    """Só sai item gerado por IA que ela nunca respondeu; item de prova real nunca é tocado."""
    return [
        str(item["id"])
        for item in items
        if item.get("stem_id") in ai_stem_ids and str(item["id"]) not in attempted_item_ids
    ]


def empty_stems(stem_ids: Iterable[str], *, remaining_items: Iterable[dict]) -> list[str]:
    used = {item.get("stem_id") for item in remaining_items}
    return sorted(stem_id for stem_id in stem_ids if stem_id not in used)
