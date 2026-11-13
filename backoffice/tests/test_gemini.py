"""Embeddings e chamadas ao Gemini: lote, tipo de tarefa, dimensão, normalização e novas tentativas."""

import math

import httpx
import pytest
from pydantic import BaseModel

from cacd_factory.gemini import (
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    call_with_retries,
    embed_documents,
    embed_query,
    generate_structured,
    normalize_l2,
)


# --- Dublês da API (externa) com a mesma forma de google.genai.types --------


class FakeContentEmbedding:
    def __init__(self, values):
        self.values = values
        self.statistics = None


class FakeEmbedContentResponse:
    def __init__(self, embeddings):
        self.embeddings = embeddings
        self.metadata = None


class FakeModels:
    def __init__(self, dimensions=EMBEDDING_DIMENSIONS, drop_last=False):
        self.dimensions = dimensions
        self.drop_last = drop_last
        self.calls = []

    def embed_content(self, *, model, contents, config):
        items = contents if isinstance(contents, list) else [contents]
        self.calls.append({"model": model, "contents": list(items), "config": config})
        vectors = [FakeContentEmbedding([3.0, 4.0] + [0.0] * (self.dimensions - 2)) for _ in items]
        if self.drop_last:
            vectors = vectors[:-1]
        return FakeEmbedContentResponse(vectors)


class FakeClient:
    def __init__(self, models):
        self.models = models


class FakeApiError(Exception):
    """Mesmo atributo que google.genai.errors.APIError expõe: o status HTTP em `code`."""

    def __init__(self, code):
        super().__init__(f"HTTP {code}")
        self.code = code


# --- Embeddings --------------------------------------------------------------


def test_documents_are_embedded_in_batches_as_retrieval_documents():
    models = FakeModels()
    texts = [f"trecho {i}" for i in range(250)]

    vectors = embed_documents(FakeClient(models), texts, title="Economia Internacional", batch_size=100)

    assert len(vectors) == 250
    assert [len(call["contents"]) for call in models.calls] == [100, 100, 50]
    assert models.calls[1]["contents"][0] == "trecho 100"
    for call in models.calls:
        assert call["model"] == EMBEDDING_MODEL
        assert call["config"].task_type == "RETRIEVAL_DOCUMENT"
        assert call["config"].output_dimensionality == 1536
        assert call["config"].title == "Economia Internacional"


def test_vectors_come_back_normalized():
    vectors = embed_documents(FakeClient(FakeModels()), ["um"], title=None)

    assert vectors[0][:2] == [0.6, 0.8]
    assert math.isclose(math.sqrt(sum(v * v for v in vectors[0])), 1.0)


def test_query_is_embedded_as_retrieval_query():
    models = FakeModels()

    vector = embed_query(FakeClient(models), "trindade impossível")

    assert models.calls[0]["config"].task_type == "RETRIEVAL_QUERY"
    assert models.calls[0]["contents"] == ["trindade impossível"]
    assert vector[:2] == [0.6, 0.8]


def test_wrong_dimension_is_rejected():
    with pytest.raises(ValueError, match="768"):
        embed_documents(FakeClient(FakeModels(dimensions=768)), ["um"], title=None)


def test_batch_with_missing_vectors_is_rejected():
    with pytest.raises(ValueError):
        embed_documents(FakeClient(FakeModels(drop_last=True)), ["um", "dois"], title=None)


def test_zero_vector_is_rejected():
    with pytest.raises(ValueError):
        normalize_l2([0.0, 0.0, 0.0])


# --- Novas tentativas ----------------------------------------------------------


def test_rate_limited_call_is_retried_with_growing_waits():
    attempts = []
    waits = []

    def flaky():
        attempts.append(1)
        if len(attempts) < 3:
            raise FakeApiError(429)
        return "ok"

    assert call_with_retries(flaky, sleep=waits.append) == "ok"
    assert len(attempts) == 3
    assert waits == [2.0, 4.0]


def test_network_failure_is_retried():
    attempts = []

    def flaky():
        attempts.append(1)
        if len(attempts) == 1:
            raise httpx.ConnectError("sem rede")
        return "ok"

    assert call_with_retries(flaky, sleep=lambda _: None) == "ok"
    assert len(attempts) == 2


def test_client_error_is_not_retried():
    attempts = []
    waits = []

    def broken():
        attempts.append(1)
        raise FakeApiError(400)

    with pytest.raises(FakeApiError):
        call_with_retries(broken, sleep=waits.append)

    assert len(attempts) == 1
    assert waits == []


class FakeGenerateResponse:
    """Mesma forma de GenerateContentResponse: `parsed` (quando o SDK validou) e `text`."""

    def __init__(self, parsed=None, text=None):
        self.parsed = parsed
        self.text = text


class FakeGenerateModels:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def generate_content(self, *, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        return self.response


class Answer(BaseModel):
    resposta: str


def test_structured_generation_sends_schema_and_system_prompt():
    models = FakeGenerateModels(FakeGenerateResponse(parsed=Answer(resposta="ok")))

    result = generate_structured(
        FakeClient(models), model="gemini-teste", system_prompt="regras", user_prompt="pergunta", schema=Answer
    )

    assert result == Answer(resposta="ok")
    call = models.calls[0]
    assert (call["model"], call["contents"]) == ("gemini-teste", "pergunta")
    assert call["config"].system_instruction == "regras"
    assert call["config"].response_mime_type == "application/json"
    assert call["config"].response_schema is Answer


def test_structured_generation_falls_back_to_the_raw_json_text():
    models = FakeGenerateModels(FakeGenerateResponse(parsed=None, text='{"resposta": "do texto"}'))

    result = generate_structured(FakeClient(models), model="m", system_prompt="s", user_prompt="u", schema=Answer)

    assert result == Answer(resposta="do texto")


def test_structured_generation_without_any_content_is_an_error():
    models = FakeGenerateModels(FakeGenerateResponse(parsed=None, text=None))

    with pytest.raises(ValueError):
        generate_structured(FakeClient(models), model="m", system_prompt="s", user_prompt="u", schema=Answer)


def test_gives_up_after_the_last_attempt():
    attempts = []
    waits = []

    def down():
        attempts.append(1)
        raise FakeApiError(503)

    with pytest.raises(FakeApiError):
        call_with_retries(down, attempts=4, sleep=waits.append)

    assert len(attempts) == 4
    assert len(waits) == 3
