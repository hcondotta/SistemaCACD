"""Formatos aceitos no acervo e o extrator responsável por cada um."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

# Docling: estrutura, tabelas, páginas e OCR de digitalizados.
DOCUMENT_SUFFIXES = frozenset({".pdf", ".docx", ".pptx", ".html", ".htm"})
# Lidos direto, cortados por seção.
TEXT_SUFFIXES = frozenset({".md", ".markdown", ".txt"})
# Transcritos pelo Whisper, com minutagem.
MEDIA_SUFFIXES = frozenset({".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".webm", ".mkv", ".mov", ".aac", ".flac"})
SUPPORTED_SUFFIXES = DOCUMENT_SUFFIXES | TEXT_SUFFIXES | MEDIA_SUFFIXES

FileKind = Literal["document", "text", "media"]


def kind_of(path: Path) -> FileKind:
    suffix = path.suffix.lower()
    if suffix in DOCUMENT_SUFFIXES:
        return "document"
    if suffix in TEXT_SUFFIXES:
        return "text"
    if suffix in MEDIA_SUFFIXES:
        return "media"
    raise ValueError(
        f"{path.name}: formato não suportado ({suffix or 'sem extensão'}). "
        f"Aceitos: {', '.join(sorted(SUPPORTED_SUFFIXES))}."
    )


def is_supported(path: Path) -> bool:
    return path.suffix.lower() in SUPPORTED_SUFFIXES
