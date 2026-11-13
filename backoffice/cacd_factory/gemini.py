"""Gemini: embeddings normalizados para o pgvector, geração estruturada e novas tentativas.

Regras do projeto (AGENTS.md, regra 4): `gemini-embedding-001` em 1536 dimensões, normalizado em L2.
Trechos do acervo vão com `RETRIEVAL_DOCUMENT`; perguntas, com `RETRIEVAL_QUERY` — a busca do app
(`src/lib/server-clients.ts`) usa o mesmo par.
"""

from __future__ import annotations

import math
import time
from collections.abc import Callable, Sequence
from typing import TypeVar

import httpx
from google.genai import types
from pydantic import BaseModel

try:  # o SDK 3.x usa httpx e httpx2; falha de rede pode vir de qualquer um dos dois
    import httpx2

    _TRANSPORT_ERRORS: tuple[type[BaseException], ...] = (httpx.TransportError, httpx2.TransportError)
except ImportError:  # pragma: no cover - depende da versão instalada do SDK
    _TRANSPORT_ERRORS = (httpx.TransportError,)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMENSIONS = 1536
EMBED_BATCH_SIZE = 100
RETRYABLE_STATUS = frozenset({408, 429, 500, 502, 503, 504})

T = TypeVar("T")
SchemaT = TypeVar("SchemaT", bound=BaseModel)


def normalize_l2(vector: Sequence[float]) -> list[float]:
    """Em 1536 dimensões a normalização é nossa; sem ela o cosseno do pgvector distorce em silêncio."""
    magnitude = math.sqrt(sum(value * value for value in vector))
    if magnitude == 0:
        raise ValueError("Embedding degenerado: vetor de norma zero.")
    return [value / magnitude for value in vector]


def is_retryable(error: BaseException) -> bool:
    if isinstance(error, _TRANSPORT_ERRORS):
        return True
    code = getattr(error, "code", None)
    return isinstance(code, int) and code in RETRYABLE_STATUS


def call_with_retries(
    operation: Callable[[], T],
    *,
    attempts: int = 5,
    base_delay: float = 2.0,
    sleep: Callable[[float], None] = time.sleep,
) -> T:
    """Repete falhas transitórias (limite de taxa, 5xx, rede) com espera dobrando a cada vez."""
    for attempt in range(1, attempts + 1):
        try:
            return operation()
        except Exception as error:
            if attempt == attempts or not is_retryable(error):
                raise
            sleep(base_delay * 2 ** (attempt - 1))
    raise AssertionError("inalcançável: o laço sempre retorna ou relança")


def _checked_vectors(embeddings, expected_count: int) -> list[list[float]]:
    received = 0 if embeddings is None else len(embeddings)
    if received != expected_count:
        raise ValueError(f"A API de embeddings devolveu {received} vetores para {expected_count} textos.")
    vectors = []
    for item in embeddings:
        values = list(item.values or [])
        if len(values) != EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Dimensão inesperada: a coluna do banco espera {EMBEDDING_DIMENSIONS}, o modelo devolveu {len(values)}."
            )
        vectors.append(normalize_l2(values))
    return vectors


def embed_documents(
    client,
    texts: Sequence[str],
    *,
    title: str | None,
    batch_size: int = EMBED_BATCH_SIZE,
    sleep: Callable[[float], None] = time.sleep,
) -> list[list[float]]:
    config = types.EmbedContentConfig(
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=EMBEDDING_DIMENSIONS,
        title=title,
    )
    vectors: list[list[float]] = []
    for start in range(0, len(texts), batch_size):
        batch = list(texts[start : start + batch_size])
        response = call_with_retries(
            lambda: client.models.embed_content(model=EMBEDDING_MODEL, contents=batch, config=config),
            sleep=sleep,
        )
        vectors.extend(_checked_vectors(response.embeddings, len(batch)))
    return vectors


def embed_query(client, text: str, *, sleep: Callable[[float], None] = time.sleep) -> list[float]:
    clean = text.strip()
    if not clean:
        raise ValueError("Consulta vazia: não há o que vetorizar.")
    config = types.EmbedContentConfig(task_type="RETRIEVAL_QUERY", output_dimensionality=EMBEDDING_DIMENSIONS)
    response = call_with_retries(
        lambda: client.models.embed_content(model=EMBEDDING_MODEL, contents=[clean], config=config),
        sleep=sleep,
    )
    return _checked_vectors(response.embeddings, 1)[0]


def generate_structured(
    client,
    *,
    model: str,
    system_prompt: str,
    user_prompt: str,
    schema: type[SchemaT],
    sleep: Callable[[float], None] = time.sleep,
) -> SchemaT:
    """Gera JSON validado pelo schema. A temperatura fica no padrão do modelo: os Gemini 3+ degradam abaixo dele."""
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        response_mime_type="application/json",
        response_schema=schema,
    )
    response = call_with_retries(
        lambda: client.models.generate_content(model=model, contents=user_prompt, config=config),
        sleep=sleep,
    )
    if isinstance(response.parsed, schema):
        return response.parsed
    if not response.text:
        raise ValueError("O modelo não devolveu conteúdo (resposta vazia ou bloqueada pelo filtro de segurança).")
    return schema.model_validate_json(response.text)
