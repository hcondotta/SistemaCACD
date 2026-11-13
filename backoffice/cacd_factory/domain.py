"""Tipos de domínio compartilhados pelos módulos da fábrica."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SubjectInfo:
    """Disciplina do edital, como está na tabela `subjects`."""

    id: str
    slug: str
    name: str


@dataclass(frozen=True)
class TopicInfo:
    """Tópico da trilha, como está na tabela `topics`."""

    id: str
    code: str
    title: str
    official_edital_ref: str | None = None
