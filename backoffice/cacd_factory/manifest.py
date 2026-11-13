"""Manifesto bibliográfico: o que entra no acervo e a qual tópico cada página pertence.

O manifesto é um JSON validado por Pydantic. Campos desconhecidos são recusados de propósito:
um "titel" digitado errado precisa virar erro, não um livro sem título.
"""

from __future__ import annotations

import json
import os
import re
from collections.abc import Sequence
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .formats import is_supported, kind_of
from .inbox import doc_type_for_inbox_path, is_answer_key, pair_answer_keys

DocType =Literal["book", "course_pdf", "video_transcript", "personal_note", "past_exam", "official_syllabus"]

# "120-145", "7", "120–145" (travessão do Word) e espaços em volta.
_PAGE_RANGE = re.compile(r"^\s*(\d+)\s*(?:[-–—]\s*(\d+)\s*)?$")


def parse_page_range(raw: str) -> tuple[int, int]:
    match = _PAGE_RANGE.match(raw or "")
    if not match:
        raise ValueError(f"Intervalo de páginas inválido: {raw!r}. Use, por exemplo, '120-145' ou '7'.")
    start = int(match.group(1))
    end = int(match.group(2) or start)
    if start < 1 or end < start:
        raise ValueError(f"Intervalo de páginas inválido: {raw!r}. A página inicial vem antes da final e começa em 1.")
    return start, end


def _path_key(path: str) -> str:
    """Chave de comparação de caminhos no Windows: sem diferença de maiúsculas ou de barra."""
    return path.strip().replace("\\", "/").casefold()


class TopicPages(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pages: str
    topic: str = Field(min_length=1)

    @field_validator("pages")
    @classmethod
    def _valid_range(cls, value: str) -> str:
        parse_page_range(value)
        return value.strip()

    @property
    def bounds(self) -> tuple[int, int]:
        return parse_page_range(self.pages)


class ManifestDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path: str = Field(min_length=1)
    title: str = Field(min_length=1)
    author: str | None = None
    edition: str | None = None
    subject: str = "economia"
    doc_type: DocType = "book"
    authority_weight: int = Field(default=5, ge=1, le=10)
    # Tópico padrão do documento inteiro (uma aula, um fichamento de um tópico só).
    topic: str | None = None
    # Faixas de páginas de um livro que cobrem tópicos específicos.
    topic_pages: list[TopicPages] = Field(default_factory=list)
    # Provas: caminho do gabarito (mesma regra de caminho do `path`).
    answer_key: str | None = None

    @model_validator(mode="after")
    def _ranges_do_not_overlap(self) -> ManifestDocument:
        spans = sorted(entry.bounds for entry in self.topic_pages)
        for previous, current in zip(spans, spans[1:]):
            if current[0] <= previous[1]:
                raise ValueError(
                    f"Faixas de páginas sobrepostas em {self.path!r}: {previous[0]}-{previous[1]} e {current[0]}-{current[1]}."
                )
        return self

    @property
    def normalized_path(self) -> str:
        return self.path.strip().replace("\\", "/")

    def topic_for_pages(self, pages: Sequence[int]) -> str | None:
        """A primeira página do trecho decide a faixa; fora de toda faixa vale o tópico do documento."""
        if pages:
            first = min(pages)
            for entry in self.topic_pages:
                start, end = entry.bounds
                if start <= first <= end:
                    return entry.topic
        return self.topic


class BibliographyManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: Literal[1] = 1
    # Pasta-base do acervo. Relativa ao próprio manifesto quando não for absoluta.
    library_root: str | None = None
    documents: list[ManifestDocument] = Field(default_factory=list)

    @model_validator(mode="after")
    def _paths_are_unique(self) -> BibliographyManifest:
        seen: dict[str, str] = {}
        for document in self.documents:
            key = _path_key(document.path)
            if key in seen:
                raise ValueError(f"Arquivo repetido no manifesto: {document.path!r} (já listado como {seen[key]!r}).")
            seen[key] = document.path
        return self

    def resolve_path(self, document: ManifestDocument, manifest_dir: Path) -> Path:
        return self.resolve(document.normalized_path, manifest_dir)

    def resolve(self, stored_path: str, manifest_dir: Path) -> Path:
        path = Path(stored_path.strip().replace("\\", "/"))
        if path.is_absolute():
            return path
        base = manifest_dir
        if self.library_root:
            root = Path(self.library_root.replace("\\", "/"))
            base = root if root.is_absolute() else manifest_dir / root
        return base / path


def load_manifest(path: Path) -> BibliographyManifest:
    with path.open(encoding="utf-8") as handle:
        return BibliographyManifest.model_validate(json.load(handle))


def save_manifest(manifest: BibliographyManifest, path: Path) -> None:
    # Campos vazios ficam no arquivo (como null) para ela ver o que pode preencher.
    payload = manifest.model_dump(mode="json")
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


# "Autor - Título" no nome do arquivo; "IS-LM", sem espaços em volta do hífen, não separa nada.
_AUTHOR_TITLE = re.compile(r"^(?P<author>[^-–—]+?)\s+[-–—]\s+(?P<title>.+)$")
_DOC_TYPE_BY_KIND: dict[str, DocType] = {"document": "book", "text": "personal_note", "media": "video_transcript"}


def _guess_author_and_title(stem: str) -> tuple[str | None, str]:
    clean = " ".join(stem.replace("_", " ").split())
    match = _AUTHOR_TITLE.match(clean)
    if match:
        return match.group("author").strip(), match.group("title").strip()
    return None, clean


def add_scanned_files(
    manifest: BibliographyManifest,
    files: Sequence[Path],
    *,
    root: Path,
    subject: str,
    manifest_dir: Path | None = None,
) -> tuple[BibliographyManifest, list[ManifestDocument]]:
    """Acrescenta ao manifesto os arquivos novos de uma pasta; o que já está listado não muda."""
    if manifest.library_root:
        base = Path(manifest.library_root)
        if not base.is_absolute():
            base = (manifest_dir or Path.cwd()) / base
    else:
        base = root
    base = Path(os.path.normpath(base))  # "backoffice/../acervo" precisa comparar igual a "acervo"

    known = {_path_key(document.path) for document in manifest.documents}
    candidates: list[tuple[Path, str]] = []
    answer_keys: list[str] = []
    for file_path in files:
        if not is_supported(file_path):
            continue
        try:
            stored = file_path.relative_to(base).as_posix()
        except ValueError:
            stored = file_path.as_posix()  # fora da pasta-base: guarda o caminho absoluto
        # Gabarito dentro de provas/ não é documento: é o par de uma prova da mesma pasta.
        if is_answer_key(file_path.name) and doc_type_for_inbox_path(stored) == "past_exam":
            answer_keys.append(stored)
        else:
            candidates.append((file_path, stored))

    exam_paths = [document.normalized_path for document in manifest.documents if document.doc_type == "past_exam"]
    exam_paths += [stored for _, stored in candidates if doc_type_for_inbox_path(stored) == "past_exam"]
    pairs = {_path_key(exam): key for exam, key in pair_answer_keys(exam_paths, answer_keys).items()}

    existing = [
        document.model_copy(update={"answer_key": pairs[_path_key(document.path)]})
        if document.answer_key is None and _path_key(document.path) in pairs
        else document
        for document in manifest.documents
    ]
    added: list[ManifestDocument] = []
    for file_path, stored in candidates:
        if _path_key(stored) in known:
            continue
        author, title = _guess_author_and_title(file_path.stem)
        added.append(
            ManifestDocument(
                path=stored,
                title=title,
                author=author,
                subject=subject,
                doc_type=doc_type_for_inbox_path(stored) or _DOC_TYPE_BY_KIND[kind_of(file_path)],
                answer_key=pairs.get(_path_key(stored)),
            )
        )
        known.add(_path_key(stored))

    updated = BibliographyManifest.model_validate(
        {
            "version": manifest.version,
            "library_root": manifest.library_root or root.as_posix(),
            "documents": [document.model_dump() for document in [*existing, *added]],
        }
    )
    return updated, added
