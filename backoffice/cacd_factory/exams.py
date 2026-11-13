"""Provas: itens Certo/Errado no formato do Cebraspe, gabarito, discursivas e o arquivo de revisão.

O parser lê o texto de cada página e não adivinha o que não está lá: o que ele não reconhece vira
aviso no arquivo de revisão, para ela conferir antes de treinar com a prova.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field, replace
from pathlib import Path

from .inbox import plain
from .sections import DocElement, Section

# Cabeçalhos de bloco do caderno do CACD (o caderno mistura as disciplinas).
# A ordem importa: o nome mais específico vem antes ("direito internacional" antes de "direito").
SUBJECT_ALIASES: tuple[tuple[str, str], ...] = (
    ("direito internacional", "direito-internacional"),
    ("historia do brasil", "historia-do-brasil"),
    ("historia mundial", "historia-mundial"),
    ("politica internacional", "politica-internacional"),
    ("lingua portuguesa", "portugues"),
    ("lingua inglesa", "ingles"),
    ("portugues", "portugues"),
    ("ingles", "ingles"),
    ("geografia", "geografia"),
    ("economia", "economia"),
    ("direito", "direito-interno"),
)

_PAGE_NUMBER =re.compile(r"^[\s–—\-]*(?:p[áa]gina\s+)?\d{1,3}(?:\s*/\s*\d{1,3})?[\s–—\-]*$", re.IGNORECASE)
_QUESTION = re.compile(r"^QUEST[ÃA]O\s+(\d{1,3})\b[.:]?\s*(.*)$", re.IGNORECASE)
_ITEM = re.compile(r"^(\d{1,3})\s+(\S.*)$")
_TEXT_HEADER = re.compile(r"^Texto\s+\S+", re.IGNORECASE)
_INSTRUCTION = re.compile(r"\bjulgue\b", re.IGNORECASE)
_SENTENCE_END = re.compile(r"[.?!:;]\s*$")
_LINES = re.compile(r"(\d{1,3})\s*linhas", re.IGNORECASE)
_MAX_LINES = re.compile(r"m[áa]xim[ao]\D{0,15}(\d{1,3})", re.IGNORECASE)
_MIN_LINES = re.compile(r"m[íi]nim[ao]\D{0,15}(\d{1,3})", re.IGNORECASE)
_SCORE = re.compile(r"valor\D{0,5}(\d{1,3}(?:[.,]\d{1,2})?)\s*ponto", re.IGNORECASE)
_ANSWER = r"(C|E|X|\*|anulad[oa])"
_PAIR = re.compile(rf"(?<![\d.])(\d{{1,3}}(?:\.\d{{1,2}})?)\s*[-–:.)]?\s*{_ANSWER}(?![\w*])", re.IGNORECASE)
_NUMBER_ROW = re.compile(r"^(?:itens|item|quest(?:ão|ao|ões|oes)|n[º°o]\.?)?\s*((?:\d{1,3}(?:\.\d{1,2})?\s+)+\d{1,3}(?:\.\d{1,2})?)$", re.IGNORECASE)
_LETTER_ROW = re.compile(r"^(?:gabaritos?|respostas?)?\s*((?:[CEX*]\s+)+[CEX*])$", re.IGNORECASE)


@dataclass(frozen=True)
class ExamItem:
    number: int
    statement: str
    page: int | None
    question: int | None = None  # preenchido quando a numeração recomeça a cada questão
    answer: str | None = None  # C, E ou X (anulado)

    @property
    def key(self) -> str:
        return f"{self.question}.{self.number}" if self.question is not None else str(self.number)


@dataclass(frozen=True)
class ExamStem:
    number: int
    text: str
    page: int | None
    items: tuple[ExamItem, ...] = ()
    subject: str | None = None  # slug da disciplina, pelo cabeçalho de bloco do caderno


def subject_for_header(line: str) -> str | None:
    """Reconhece um cabeçalho de disciplina: linha curta, em caixa alta, com o nome da matéria."""
    text = line.strip()
    letters = [char for char in text if char.isalpha()]
    if not letters or len(text) > 60 or sum(char.isupper() for char in letters) / len(letters) < 0.8:
        return None
    normalized = plain(text)
    for alias, slug in SUBJECT_ALIASES:
        if re.search(rf"\b{alias}\b", normalized):
            return slug
    return None


@dataclass(frozen=True)
class EssayQuestion:
    number: int
    text: str
    page: int | None
    max_lines: int | None = None
    min_lines: int | None = None
    max_score: float | None = None


@dataclass(frozen=True)
class ExamDraft:
    stems: list[ExamStem] = field(default_factory=list)
    essays: list[EssayQuestion] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _clean_pages(pages: Sequence[str]) -> list[list[str]]:
    """Tira cabeçalho, rodapé e número de página: linhas que se repetem no alto ou no pé das páginas."""
    split = [[" ".join(line.split()) for line in page.replace("\r\n", "\n").split("\n")] for page in pages]
    split = [[line for line in lines if line] for lines in split]
    repeated: set[str] = set()
    if len(split) >= 2:
        limit = max(2, math.ceil(len(split) * 0.5))
        counts = Counter(
            key for lines in split for key in {re.sub(r"\d+", "#", line) for line in lines[:3] + lines[-3:]}
        )
        repeated = {key for key, count in counts.items() if count >= limit and not _INSTRUCTION.search(key)}
    return [
        [line for line in lines if re.sub(r"\d+", "#", line) not in repeated and not _PAGE_NUMBER.match(line)]
        for lines in split
    ]


def _essay(number: int, lines: Sequence[tuple[str, int]], page: int | None) -> EssayQuestion | None:
    markers = [text for text, _ in lines if _LINES.search(text) or _SCORE.search(text)]
    if not markers:
        return None
    joined = " ".join(markers)
    max_match = _MAX_LINES.search(joined)
    any_lines = _LINES.search(joined)
    min_match = _MIN_LINES.search(joined)
    score = _SCORE.search(joined)
    return EssayQuestion(
        number=number,
        text="\n".join(text for text, _ in lines if text not in markers),
        page=page,
        max_lines=int(max_match.group(1)) if max_match else (int(any_lines.group(1)) if any_lines else None),
        min_lines=int(min_match.group(1)) if min_match else None,
        max_score=float(score.group(1).replace(",", ".")) if score else None,
    )


class _ExamParser:
    def __init__(self) -> None:
        self.stems: list[ExamStem] = []
        self.essays: list[EssayQuestion] = []
        self.warnings: list[str] = []
        self.pending: list[tuple[str, int]] = []
        self.instruction_seen = False
        self.item: dict | None = None
        self.stem_index: int | None = None
        self.question: int | None = None
        self.question_page: int | None = None
        self.question_items = 0
        self.question_mode = False
        self.restarted = False
        self.last_number = 0
        self.subject: str | None = None

    # --- linhas -------------------------------------------------------------
    def feed(self, line: str, page: int) -> None:
        subject = subject_for_header(line)
        if subject:
            # O mesmo cabeçalho repetido no alto de cada página do bloco não interrompe o item.
            if subject != self.subject:
                self._close_item()
                self.subject, self.stem_index, self.pending, self.instruction_seen = subject, None, [], False
            return
        question = _QUESTION.match(line)
        if question:
            self._close_question()
            self.question_mode = True
            self.question, self.question_page, self.question_items = int(question.group(1)), page, 0
            self.instruction_seen, self.stem_index = False, None
            if question.group(2).strip():
                self.feed(question.group(2).strip(), page)
            return
        item = _ITEM.match(line)
        if item and self._accepts(int(item.group(1))):
            self._start_item(int(item.group(1)), item.group(2), page)
        elif _INSTRUCTION.search(line):
            self._instruction(line, page)
        elif _TEXT_HEADER.match(line) and self.item is not None:
            self._close_item()
            self.stem_index, self.pending, self.instruction_seen = None, [(line, page)], False
        elif self.item is not None:
            self.item["lines"].append((line, page))
        else:
            self.pending.append((line, page))

    def _accepts(self, number: int) -> bool:
        if not self.instruction_seen:
            return False
        if self.last_number == 0 or number == self.last_number + 1:
            return True
        return self.question_mode and self.question_items == 0 and number == 1

    def _start_item(self, number: int, text: str, page: int) -> None:
        self._close_item()
        if self.stem_index is None:
            self._open_stem(page)
        if self.question_mode and self.question_items == 0 and number == 1 and self.last_number > 0:
            self.restarted = True
        self.item = {"number": number, "lines": [(text, page)], "page": page, "question": self.question}
        self.last_number = number
        self.question_items += 1

    def _instruction(self, line: str, page: int) -> None:
        if self.item is not None:
            # Uma nova instrução abre outro enunciado; o que vem depois da última frase
            # completa do item anterior já é o começo desse enunciado.
            lines = self.item["lines"]
            cut = 1
            for index in range(len(lines) - 1, -1, -1):
                if _SENTENCE_END.search(lines[index][0]):
                    cut = index + 1
                    break
            moved, self.item["lines"] = lines[cut:], lines[:cut]
            self._close_item()
            self.stem_index, self.pending = None, moved
        elif self.stem_index is not None:
            self.stem_index = None
        self.pending.append((line, page))
        self.instruction_seen = True

    def _open_stem(self, page: int) -> None:
        lines = self.pending
        if not self.stems:
            headers = [index for index, (text, _) in enumerate(lines) if _TEXT_HEADER.match(text)]
            if headers:
                lines = lines[headers[-1] :]  # o que vem antes do 1º "Texto" é capa e instrução de prova
        number = self.question if self.question_mode and self.question is not None else len(self.stems) + 1
        self.stems.append(
            ExamStem(
                number=number,
                text="\n".join(text for text, _ in lines),
                page=lines[0][1] if lines else page,
                subject=self.subject,
            )
        )
        self.stem_index = len(self.stems) - 1
        self.pending = []

    def _close_item(self) -> None:
        if self.item is None or self.stem_index is None:
            self.item = None
            return
        stem = self.stems[self.stem_index]
        statement = " ".join(text for text, _ in self.item["lines"]).strip()
        new_item = ExamItem(number=self.item["number"], statement=statement, page=self.item["page"], question=self.item["question"])
        self.stems[self.stem_index] = replace(stem, items=(*stem.items, new_item))
        self.item = None

    def _close_question(self) -> None:
        self._close_item()
        if self.question_mode and self.question is not None and self.question_items == 0:
            essay = _essay(self.question, self.pending, self.question_page)
            if essay:
                self.essays.append(essay)
            elif self.pending:
                self.warnings.append(f"Questão {self.question}: nenhum item numerado reconhecido.")
        if self.question_mode:
            self.pending = []

    def finish(self) -> ExamDraft:
        self._close_question()
        stems = self.stems
        if not self.restarted:
            stems = [replace(stem, items=tuple(replace(i, question=None) for i in stem.items)) for stem in stems]
            numbers = [item.number for stem in stems for item in stem.items]
            for current, following in zip(numbers, numbers[1:]):
                if following != current + 1:
                    self.warnings.append(f"A numeração salta do item {current} para o {following}: confira se faltou algum.")
        if not stems and not self.essays:
            self.warnings.append(
                "Nenhuma questão reconhecida: confira se o PDF tem texto (não é só imagem) "
                "e se os itens seguem o formato 'julgue os itens' com numeração."
            )
        return ExamDraft(stems=stems, essays=self.essays, warnings=self.warnings)


def parse_exam(pages: Sequence[str]) -> ExamDraft:
    parser = _ExamParser()
    for page_number, lines in enumerate(_clean_pages(pages), start=1):
        for line in lines:
            parser.feed(line, page_number)
    return parser.finish()


def _normalize_answer(token: str) -> str:
    token = token.strip().upper()
    return "X" if token in {"*", "ANULADO", "ANULADA"} else token


def parse_answer_key(text: str) -> dict[str, str]:
    """Gabarito em pares ("1 C 2 E") ou em grade (linha de itens seguida da linha de respostas)."""
    lines = [" ".join(line.split()) for line in text.replace("\r\n", "\n").split("\n")]
    lines = [line for line in lines if line]
    answers: dict[str, str] = {}
    consumed: set[int] = set()
    for index in range(len(lines) - 1):
        numbers, letters = _NUMBER_ROW.match(lines[index]), _LETTER_ROW.match(lines[index + 1])
        if numbers and letters:
            keys, values = numbers.group(1).split(), letters.group(1).split()
            if len(keys) == len(values):
                answers.update({key: _normalize_answer(value) for key, value in zip(keys, values)})
                consumed.update({index, index + 1})
    for index, line in enumerate(lines):
        if index not in consumed:
            for match in _PAIR.finditer(line):
                answers.setdefault(match.group(1), _normalize_answer(match.group(2)))
    return answers


def _natural(key: str) -> tuple[int, ...]:
    return tuple(int(part) for part in key.split("."))


def apply_answer_key(draft: ExamDraft, answers: Mapping[str, str]) -> ExamDraft:
    warnings = list(draft.warnings)
    used: set[str] = set()
    stems = []
    for stem in draft.stems:
        items = []
        for item in stem.items:
            answer = answers.get(item.key)
            if answer is None:
                warnings.append(f"Item {item.key}: sem resposta no gabarito.")
            else:
                used.add(item.key)
                if answer == "X":
                    warnings.append(f"Item {item.key}: anulado no gabarito, fica fora do treino.")
            items.append(replace(item, answer=answer))
        stems.append(replace(stem, items=tuple(items)))
    extra = sorted(set(answers) - used, key=_natural)
    if extra:
        warnings.append(f"O gabarito tem {len(extra)} item(ns) que não aparecem na prova: {', '.join(extra[:12])}.")
    return replace(draft, stems=stems, warnings=warnings)


def render_exam_review(draft: ExamDraft, *, title: str) -> str:
    """Arquivo para conferir a extração: cada questão com seus itens, respostas e os avisos no topo."""
    total = sum(len(stem.items) for stem in draft.stems)
    lines = [
        f"# Revisão: {title}",
        "",
        f"{len(draft.stems)} questão(ões) objetiva(s), {total} itens; {len(draft.essays)} discursiva(s).",
        "",
    ]
    if draft.warnings:
        lines += ["## Avisos", "", *[f"- {warning}" for warning in draft.warnings], ""]
    for stem in draft.stems:
        lines += [f"## Questão {stem.number}" + (f" (p. {stem.page})" if stem.page else ""), "", stem.text, ""]
        for item in stem.items:
            mark = {"C": "C", "E": "E", "X": "anulado"}.get(item.answer or "", "sem gabarito")
            lines.append(f"- **{item.key}** [{mark}] {item.statement}")
        lines.append("")
    for essay in draft.essays:
        lines += [f"## Discursiva {essay.number}" + (f" (p. {essay.page})" if essay.page else ""), "", essay.text, ""]
        details = []
        if essay.min_lines:
            details.append(f"mínimo {essay.min_lines} linhas")
        if essay.max_lines:
            details.append(f"máximo {essay.max_lines} linhas")
        if essay.max_score is not None:
            details.append(f"valor {essay.max_score:g} pontos")
        if details:
            lines += ["_" + " · ".join(details) + "_", ""]
    return "\n".join(lines).rstrip() + "\n"


def stale_exam_items(existing: Sequence[Mapping], *, kept: set[tuple[str, int]], attempted_item_ids: set[str]) -> list[str]:
    """Itens que sumiram da nova leitura da prova; os que ela já respondeu ficam, com o histórico."""
    return [
        str(row["id"])
        for row in existing
        if (row["stem_id"], row["item_number"]) not in kept and str(row["id"]) not in attempted_item_ids
    ]


def exam_sections(draft: ExamDraft, *, subject: str) -> list[Section]:
    """Uma seção por questão da disciplina do documento. O gabarito não entra no texto: fica nos itens."""
    sections: list[Section] = []
    for stem in draft.stems:
        if stem.subject not in (None, subject):
            continue
        elements = [DocElement(kind="text", text=stem.text, page=stem.page)] if stem.text.strip() else []
        elements += [DocElement(kind="list_item", text=f"**{item.key}.** {item.statement}", page=item.page) for item in stem.items]
        sections.append(
            Section(position=len(sections), title=f"Questão {stem.number}", level=1, heading_path=(f"Questão {stem.number}",), elements=tuple(elements))
        )
    for essay in draft.essays:
        details = " · ".join(
            part
            for part in (
                f"Extensão máxima: {essay.max_lines} linhas" if essay.max_lines else "",
                f"Valor: {essay.max_score:g} pontos" if essay.max_score is not None else "",
            )
            if part
        )
        elements = [DocElement(kind="text", text=essay.text, page=essay.page)]
        if details:
            elements.append(DocElement(kind="text", text=f"_{details}_", page=essay.page))
        title = f"Discursiva {essay.number}"
        sections.append(Section(position=len(sections), title=title, level=1, heading_path=(title,), elements=tuple(elements)))
    return sections


def read_pdf_pages(path: Path) -> list[str]:
    """Texto puro de cada página (pypdfium2): a quebra de linha é o que separa um item do outro."""
    import pypdfium2 as pdfium

    document = pdfium.PdfDocument(str(path))
    try:
        return [document[index].get_textpage().get_text_range() for index in range(len(document))]
    finally:
        document.close()
