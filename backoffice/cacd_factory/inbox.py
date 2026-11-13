"""Pasta de entrada do acervo: a subpasta diz o tipo do arquivo e cada prova acha o seu gabarito.

    acervo/entrada/livros/      livros e capítulos
    acervo/entrada/apostilas/   apostilas de cursinho
    acervo/entrada/aulas/       videoaulas e áudios (com .srt/.vtt ao lado, se houver)
    acervo/entrada/provas/      cadernos de prova e gabaritos ("gabarito" no nome)
    acervo/entrada/anotacoes/   fichamentos e resumos dela
    acervo/entrada/edital/      editais
"""

from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from collections.abc import Iterable
from pathlib import PurePosixPath

INBOX_FOLDERS: dict[str, str] = {
    "livros": "book",
    "livro": "book",
    "apostilas": "course_pdf",
    "apostila": "course_pdf",
    "aulas": "video_transcript",
    "aula": "video_transcript",
    "videoaulas": "video_transcript",
    "provas": "past_exam",
    "prova": "past_exam",
    "anotacoes": "personal_note",
    "anotacao": "personal_note",
    "fichamentos": "personal_note",
    "resumos": "personal_note",
    "edital": "official_syllabus",
    "editais": "official_syllabus",
}
INBOX_SUBFOLDERS = ("livros", "apostilas", "aulas", "provas", "anotacoes", "edital")

_KEY_WORDS = re.compile(r"\b(?:gabarito|gabaritos|definitivo|preliminar|oficial|final)\b")


def plain(text: str) -> str:
    """Minúsculas e sem acento, para comparar nomes de pasta e de arquivo."""
    decomposed = unicodedata.normalize("NFD", text.casefold())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def _posix(path: str) -> PurePosixPath:
    return PurePosixPath(path.replace("\\", "/"))


def doc_type_for_inbox_path(relative_path: str) -> str | None:
    parts = _posix(relative_path).parts
    if len(parts) < 2:
        return None
    return INBOX_FOLDERS.get(plain(parts[0]))


def is_answer_key(name: str) -> bool:
    return "gabarito" in plain(_posix(name).name)


def _comparable(path: str) -> str:
    stem = _KEY_WORDS.sub(" ", plain(_posix(path).stem))
    return " ".join(re.sub(r"[_\-–—.()]+", " ", stem).split())


def pair_answer_keys(exams: Iterable[str], keys: Iterable[str]) -> dict[str, str]:
    """Na mesma pasta: uma prova e um gabarito formam par; com várias provas, casa pelo nome."""
    exams_by_folder: dict[str, list[str]] = defaultdict(list)
    for exam in exams:
        exams_by_folder[str(_posix(exam).parent)].append(exam)
    keys_by_folder: dict[str, list[str]] = defaultdict(list)
    for key in keys:
        keys_by_folder[str(_posix(key).parent)].append(key)

    pairs: dict[str, str] = {}
    for folder, folder_keys in keys_by_folder.items():
        folder_exams = exams_by_folder.get(folder, [])
        if len(folder_exams) == 1 and len(folder_keys) == 1:
            pairs[folder_exams[0]] = folder_keys[0]
            continue
        for key in folder_keys:
            wanted = _comparable(key)
            matches = [exam for exam in folder_exams if _comparable(exam) == wanted]
            if not matches and wanted:
                matches = [exam for exam in folder_exams if wanted in _comparable(exam) or _comparable(exam) in wanted]
            if len(matches) == 1:
                pairs[matches[0]] = key
    return pairs
