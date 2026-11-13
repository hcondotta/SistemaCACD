"""Trechos do acervo: texto, rótulo de citação e cabeçalho contextual, prontos para vetorizar.

O rótulo de citação (`citation_label`) é o que o Tutor e as fichas citam. Ele precisa permitir que
a aluna ache o trecho no livro: autor, obra, seção e página (ou minutagem, nas aulas).
"""

from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass, field

from .domain import TopicInfo
from .manifest import ManifestDocument

MAX_SECTION_CHARS = 80
DEFAULT_MAX_CHARS = 1800

_SENTENCE_BREAK = re.compile(r"(?<=[.!?…;:])\s+")


@dataclass(frozen=True)
class ExtractedBlock:
    """Pedaço de texto vindo de um extrator, com a localização dele na fonte."""

    text: str
    headings: tuple[str, ...] = ()
    pages: tuple[int, ...] = ()
    start_seconds: float | None = None
    end_seconds: float | None = None
    # Seção legível de onde o bloco saiu: liga o resultado da busca ao ponto exato do leitor.
    section_position: int | None = None


@dataclass(frozen=True)
class ChunkRecord:
    """Linha de `document_chunks` pronta para receber o vetor."""

    chunk_index: int
    topic_id: str | None
    topic_code: str | None
    content: str
    citation_label: str
    metadata: dict = field(default_factory=dict)


def format_pages(pages: Sequence[int]) -> str:
    if not pages:
        return ""
    low, high = min(pages), max(pages)
    return f"p. {low}" if low == high else f"pp. {low}–{high}"


def format_timestamp(seconds: float) -> str:
    hours, rest = divmod(int(seconds), 3600)
    minutes, secs = divmod(rest, 60)
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes:02d}:{secs:02d}"


def _shorten(text: str, limit: int = MAX_SECTION_CHARS) -> str:
    clean = " ".join(text.split())
    if len(clean) <= limit:
        return clean
    return clean[: limit - 1].rstrip() + "…"


def build_citation_label(*, title: str, author: str | None, edition: str | None, block: ExtractedBlock) -> str:
    work = title.strip()
    if edition and edition.strip():
        work = f"{work} ({edition.strip()})"
    parts = [f"{author.strip()} — {work}" if author and author.strip() else work]
    if block.headings:
        parts.append(f"“{_shorten(block.headings[-1])}”")
    if block.start_seconds is not None and block.end_seconds is not None:
        parts.append(f"{format_timestamp(block.start_seconds)}–{format_timestamp(block.end_seconds)}")
    elif block.pages:
        parts.append(format_pages(block.pages))
    return ", ".join(parts)


def build_contextual_content(*, subject_name: str, topic: TopicInfo | None, citation_label: str, text: str) -> str:
    """Cabeçalho que entra no vetor e na busca textual: situa o trecho mesmo fora do livro."""
    parts = [f"Disciplina: {subject_name}"]
    if topic is not None:
        parts.append(f"Tópico {topic.code}: {topic.title}")
    parts.append(f"Fonte: {citation_label}")
    return f"[{' | '.join(parts)}]\n{text.strip()}"


def split_oversized(paragraph: str, max_chars: int) -> list[str]:
    """Quebra um parágrafo grande em frases; uma frase maior que o limite é cortada entre palavras."""
    pieces: list[str] = []
    current = ""
    for sentence in _SENTENCE_BREAK.split(paragraph):
        sentence = sentence.strip()
        if not sentence:
            continue
        while len(sentence) > max_chars:
            cut = sentence.rfind(" ", 0, max_chars)
            if cut <= 0:
                cut = max_chars
            if current:
                pieces.append(current)
                current = ""
            pieces.append(sentence[:cut].rstrip())
            sentence = sentence[cut:].lstrip()
        if not sentence:
            continue
        candidate = f"{current} {sentence}" if current else sentence
        if len(candidate) <= max_chars:
            current = candidate
        else:
            pieces.append(current)
            current = sentence
    if current:
        pieces.append(current)
    return pieces


def build_chunk_records(
    document: ManifestDocument,
    blocks: Iterable[ExtractedBlock],
    *,
    subject_name: str,
    topics: Mapping[str, TopicInfo],
    topic_for_block: Callable[[ExtractedBlock], str | None] | None = None,
) -> list[ChunkRecord]:
    """`topic_for_block` permite que o tópico venha da seção (inclusive escolhido à mão na interface)."""
    records: list[ChunkRecord] = []
    for block in blocks:
        text = block.text.strip()
        if not text:
            continue
        code = topic_for_block(block) if topic_for_block else document.topic_for_pages(block.pages)
        topic = None
        if code is not None:
            topic = topics.get(code)
            if topic is None:
                raise ValueError(
                    f"O tópico {code!r} indicado para {document.path!r} não existe na disciplina {document.subject!r}."
                )
        label = build_citation_label(title=document.title, author=document.author, edition=document.edition, block=block)
        metadata: dict = {}
        if block.pages:
            metadata["pages"] = sorted(set(block.pages))
        if block.headings:
            metadata["headings"] = list(block.headings)
        if block.start_seconds is not None:
            metadata["start_seconds"] = block.start_seconds
        if block.end_seconds is not None:
            metadata["end_seconds"] = block.end_seconds
        if block.section_position is not None:
            metadata["section_position"] = block.section_position
        records.append(
            ChunkRecord(
                chunk_index=len(records),
                topic_id=topic.id if topic else None,
                topic_code=topic.code if topic else None,
                content=build_contextual_content(subject_name=subject_name, topic=topic, citation_label=label, text=text),
                citation_label=label,
                metadata=metadata,
            )
        )
    return records
