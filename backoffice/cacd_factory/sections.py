"""Seções legíveis: dos elementos de um documento (títulos, parágrafos, tabelas, figuras) à leitura.

Os extratores (Docling, legendas, Whisper, provas) produzem `DocElement`s; daqui saem as seções
que a aluna lê no app e os blocos que viram trechos pesquisáveis.
"""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, replace
from typing import Literal

from .chunking import DEFAULT_MAX_CHARS, ExtractedBlock, format_pages, format_timestamp, split_oversized

ElementKind = Literal["heading", "text", "list_item", "table", "picture", "formula", "code", "speech"]


@dataclass(frozen=True)
class DocElement:
    kind: ElementKind
    text: str
    level: int = 1
    page: int | None = None
    asset_key: str | None = None
    caption: str | None = None
    start_seconds: float | None = None
    end_seconds: float | None = None


def _render(element: DocElement) -> str:
    text = element.text.strip()
    if element.kind == "picture":
        alt = text or (f"Figura da p. {element.page}" if element.page else "Figura")
        return f"![{alt}](asset:{element.asset_key})"
    if element.kind == "table":
        return f"**{element.caption.strip()}**\n\n{text}" if element.caption and element.caption.strip() else text
    if element.kind == "formula":
        return f"`{text}`"
    if element.kind == "code":
        return f"```\n{text}\n```"
    if element.kind == "list_item":
        return f"- {text}"
    return text


def render_elements(elements: Iterable[DocElement]) -> str:
    """Markdown da seção: itens de lista seguidos formam uma lista; falas seguidas, um parágrafo."""
    blocks: list[str] = []
    previous: str | None = None
    for element in elements:
        rendered = _render(element)
        if not rendered:
            continue
        if blocks and element.kind == previous == "list_item":
            blocks[-1] += "\n" + rendered
        elif blocks and element.kind == previous == "speech":
            blocks[-1] += " " + rendered
        else:
            blocks.append(rendered)
        previous = element.kind
    return "\n\n".join(blocks)


@dataclass(frozen=True)
class Section:
    position: int
    title: str
    level: int
    heading_path: tuple[str, ...]
    elements: tuple[DocElement, ...]
    start_seconds: float | None = None
    end_seconds: float | None = None
    heading_page: int | None = None  # a seção começa na página do título, não na do 1º parágrafo

    @property
    def pages(self) -> tuple[int, ...]:
        pages = {element.page for element in self.elements if element.page is not None}
        if self.heading_page is not None:
            pages.add(self.heading_page)
        return tuple(sorted(pages))

    @property
    def page_start(self) -> int | None:
        return self.pages[0] if self.pages else None

    @property
    def page_end(self) -> int | None:
        return self.pages[-1] if self.pages else None

    @property
    def content_md(self) -> str:
        return render_elements(self.elements)

    @property
    def asset_keys(self) -> tuple[str, ...]:
        return tuple(element.asset_key for element in self.elements if element.kind == "picture" and element.asset_key)

    @property
    def word_count(self) -> int:
        return sum(len(element.text.split()) for element in self.elements if element.kind != "picture")


def build_sections(elements: Iterable[DocElement], *, document_title: str) -> list[Section]:
    """Cada título abre uma seção; título sem conteúdo só entra no caminho dos que vêm abaixo dele."""
    sections: list[Section] = []
    stack: list[tuple[int, str]] = []
    content: list[DocElement] = []
    title, level, path, heading_page = document_title, 1, (), None

    def flush() -> None:
        if content:
            sections.append(
                Section(
                    position=len(sections),
                    title=title,
                    level=level,
                    heading_path=path,
                    elements=tuple(content),
                    heading_page=heading_page,
                )
            )
            content.clear()

    for element in elements:
        if element.kind == "heading":
            flush()
            heading_text = " ".join(element.text.split())
            while stack and stack[-1][0] >= element.level:
                stack.pop()
            stack.append((element.level, heading_text))
            title, level, path = heading_text, element.level, tuple(text for _, text in stack)
            heading_page = element.page
        elif element.text.strip() or element.kind == "picture":
            content.append(element)
    flush()
    return sections


def section_blocks(section: Section, *, max_chars: int = DEFAULT_MAX_CHARS) -> list[ExtractedBlock]:
    """Blocos pesquisáveis da seção; de figura entra só a legenda, nunca a referência da imagem."""
    pieces: list[tuple[str, DocElement]] = []
    for element in section.elements:
        if element.kind == "picture":
            if element.text.strip():
                pieces.append((element.text.strip(), element))
            continue
        rendered = _render(element)
        if not rendered:
            continue
        parts = split_oversized(rendered, max_chars) if len(rendered) > max_chars else [rendered]
        pieces.extend((part, element) for part in parts)

    blocks: list[ExtractedBlock] = []
    group: list[tuple[str, DocElement]] = []

    def joined(items: Sequence[tuple[str, DocElement]]) -> str:
        text = ""
        for index, (piece, element) in enumerate(items):
            if index == 0:
                text = piece
            elif element.kind == "speech" and items[index - 1][1].kind == "speech":
                text += " " + piece
            else:
                text += "\n\n" + piece
        return text

    def flush() -> None:
        if not group:
            return
        elements = [element for _, element in group]
        starts = [e.start_seconds for e in elements if e.start_seconds is not None]
        ends = [e.end_seconds for e in elements if e.end_seconds is not None]
        blocks.append(
            ExtractedBlock(
                text=joined(group),
                headings=section.heading_path,
                pages=tuple(sorted({e.page for e in elements if e.page is not None})),
                start_seconds=min(starts) if starts else section.start_seconds,
                end_seconds=max(ends) if ends else section.end_seconds,
                section_position=section.position,
            )
        )
        group.clear()

    for piece in pieces:
        if group and len(joined([*group, piece])) > max_chars:
            flush()
        group.append(piece)
    flush()
    return blocks


def document_markdown(title: str, sections: Sequence[Section]) -> str:
    """O documento extraído inteiro, para ela abrir no computador e conferir o que saiu do arquivo."""
    lines = [f"# {title}", ""]
    for section in sections:
        lines += [f"{'#' * min(section.level + 1, 6)} {section.title}", ""]
        if section.start_seconds is not None and section.end_seconds is not None:
            lines += [f"_{format_timestamp(section.start_seconds)}–{format_timestamp(section.end_seconds)}_", ""]
        elif section.pages:
            lines += [f"_{format_pages(section.pages)}_", ""]
        lines += [section.content_md, ""]
    return "\n".join(lines).rstrip() + "\n"


_CAPTION = re.compile(r"^(?:figura|fig\.|gr[áa]fico|quadro|imagem|diagrama|esquema|mapa)\s*[\dIVXLC]+", re.IGNORECASE)


def _is_caption(element: DocElement | None) -> bool:
    return bool(element and element.kind == "text" and len(element.text) <= 240 and _CAPTION.match(element.text.strip()))


def attach_loose_captions(elements: Sequence[DocElement]) -> list[DocElement]:
    """Legenda que o extrator deixou solta, colada na figura (abaixo ou acima), passa a ser dela."""
    result: list[DocElement] = []
    skip_next = False
    for index, element in enumerate(elements):
        if skip_next:
            skip_next = False
            continue
        if element.kind == "picture" and not element.text.strip():
            following = elements[index + 1] if index + 1 < len(elements) else None
            if _is_caption(following):
                result.append(replace(element, text=following.text.strip()))
                skip_next = True
                continue
            if result and _is_caption(result[-1]):
                result[-1] = replace(element, text=result[-1].text.strip())
                continue
        result.append(element)
    return result


# ---------------------------------------------------------------------------
# Anotações em Markdown ou texto puro
# ---------------------------------------------------------------------------

_MD_HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
_MD_LIST = re.compile(r"^(?:[-*+]|\d{1,3}[.)])\s+(.*)$")


def markdown_elements(text: str) -> list[DocElement]:
    """Fichamentos dela: títulos (#), parágrafos, listas e tabelas viram elementos de seção."""
    elements: list[DocElement] = []
    paragraph: list[str] = []
    table: list[str] = []

    def flush() -> None:
        if paragraph:
            elements.append(DocElement(kind="text", text=" ".join(paragraph)))
            paragraph.clear()
        if table:
            elements.append(DocElement(kind="table", text="\n".join(table)))
            table.clear()

    for raw in text.replace("\r\n", "\n").split("\n"):
        line = raw.strip()
        if not line:
            flush()
            continue
        if line.startswith("|"):
            if paragraph:
                flush()
            table.append(line)
            continue
        if table:
            flush()
        heading = _MD_HEADING.match(line)
        if heading:
            flush()
            elements.append(DocElement(kind="heading", text=heading.group(2).strip(), level=len(heading.group(1))))
            continue
        item = _MD_LIST.match(line)
        if item:
            flush()
            elements.append(DocElement(kind="list_item", text=item.group(1).strip()))
            continue
        paragraph.append(line)
    flush()
    return elements


# ---------------------------------------------------------------------------
# Hierarquia dos títulos
# ---------------------------------------------------------------------------

_HASHES = re.compile(r"^(#{1,6})\s+(.*)$")
_NUMBERED = re.compile(r"^(\d{1,2}(?:\.\d{1,2})*)\.?\s+\S")
_KEYWORD_END = r"(?=[\s\d:.\-–—]|$)"
_PART = re.compile(rf"^(?:parte|part){_KEYWORD_END}", re.IGNORECASE)
_CHAPTER = re.compile(
    rf"^(?:cap[ií]tulo|cap\.|unidade|m[óo]dulo|aula|li[çc][ãa]o|chapter|unit|lesson){_KEYWORD_END}", re.IGNORECASE
)


def infer_heading_levels(elements: Iterable[DocElement]) -> list[DocElement]:
    """Deduz o nível dos títulos de um PDF pela numeração (5.1, 5.1.2) e por Parte/Capítulo."""
    result: list[DocElement] = []
    part_seen = False
    chapter_level: int | None = None
    anchor_level = 0  # nível do último título numerado ou com palavra-chave
    for element in elements:
        if element.kind != "heading":
            result.append(element)
            continue
        text = " ".join(element.text.split())
        hashes = _HASHES.match(text)
        numbered = _NUMBERED.match(text)
        if hashes:
            level = len(hashes.group(1))
            text = hashes.group(2).strip()
            anchor_level = level
        elif _PART.match(text):
            level, part_seen, chapter_level, anchor_level = 1, True, None, 1
        elif _CHAPTER.match(text):
            level = 2 if part_seen else 1
            chapter_level = anchor_level = level
        elif numbered:
            components = numbered.group(1).count(".") + 1
            if chapter_level is None:
                level = components
            else:
                level = chapter_level + (1 if components == 1 else components - 1)
            anchor_level = level
        else:
            level = anchor_level + 1 if anchor_level else 1
        result.append(replace(element, text=text, level=min(level, 6)))
    return result
