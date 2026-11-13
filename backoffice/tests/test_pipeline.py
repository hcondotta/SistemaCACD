"""Orquestração: ingestão idempotente (seções, figuras, trechos, provas) e síntese ancorada no acervo."""

import hashlib
import shutil

import pytest

from cacd_factory.domain import SubjectInfo, TopicInfo
from cacd_factory.exams import ExamDraft, ExamItem, ExamStem
from cacd_factory.manifest import ManifestDocument
from cacd_factory.pipeline import AssetFile, Extraction, ingest_document, synthesize_topic
from cacd_factory.sections import DocElement, build_sections
from fakes import InMemoryIngestStore, RecordingSynthesisStore, make_package, rpc_row

SUBJECT = SubjectInfo(id="subj-econ", slug="economia", name="Economia")
TOPIC = TopicInfo(id="t33", code="3.3", title="Mundell-Fleming", official_edital_ref="Ponto 4")
TOPICS = {"3.3": TOPIC}


def make_doc(path="economia/k.pdf", **overrides):
    data = {"path": path, "title": "EI", "author": "K"}
    data.update(overrides)
    return ManifestDocument.model_validate(data)


def extraction(*parts, assets=(), exam=None, extra_elements=()):
    elements = []
    for title, text, page in parts:
        elements += [DocElement(kind="heading", text=title, page=page), DocElement(kind="text", text=text, page=page)]
    elements += list(extra_elements)
    return Extraction(sections=build_sections(elements, document_title="EI"), assets=list(assets), exam=exam)


TWO_SECTIONS = extraction(("Um", "Um.", 12), ("Dois", "Dois, mais longo.", 30))
MAPPED = {"topic_pages": [{"pages": "10-20", "topic": "3.3"}]}


def recording_embed(calls):
    def embed(texts, title):
        calls.append(list(texts))
        return [[float(len(text))] for text in texts]

    return embed


def forbidden_embed(texts, title):
    raise AssertionError("não deveria vetorizar nada")


def forbidden_extract(path, document):
    raise AssertionError("não deveria extrair de novo")


def ingest(store, file_path, doc, result=TWO_SECTIONS, embed="padrão", extract=None, **options):
    return ingest_document(
        doc=doc,
        file_path=file_path,
        subject=SUBJECT,
        topics=TOPICS,
        store=store,
        extract=extract or (lambda path, document: result),
        embed=recording_embed([]) if embed == "padrão" else embed,
        **options,
    )


@pytest.fixture
def book(tmp_path):
    path = tmp_path / "k.pdf"
    path.write_bytes(b"livro v1")
    return path


# --- Ingestão --------------------------------------------------------------------


def test_first_ingestion_stores_document_sections_and_chunks(book):
    store = InMemoryIngestStore()

    result = ingest(store, book, make_doc(**MAPPED))

    assert (result.status, result.chunk_count, result.section_count) == ("ingested", 2, 2)
    [document] = store.documents.values()
    assert document["content_hash"] == hashlib.sha256(b"livro v1").hexdigest()
    assert (document["file_path"], document["subject_id"]) == ("economia/k.pdf", "subj-econ")
    assert document["processed_at"] is not None
    assert [(s["position"], s["title"], s["topic_id"], s["topic_assigned_by"]) for s in store.sections[document["id"]]] == [
        (0, "Um", "t33", "manifest"),
        (1, "Dois", None, "manifest"),
    ]
    first, second = store.chunks[(document["id"], 0)], store.chunks[(document["id"], 1)]
    assert (first["topic_id"], second["topic_id"]) == ("t33", None)
    assert first["metadata"]["section_position"] == 0
    assert first["embedding"] == [float(len(first["content"]))]
    assert second["embedding"] == [float(len(second["content"]))]


def test_without_an_embedder_chunks_are_saved_for_word_search_only(book):
    store = InMemoryIngestStore()

    result = ingest(store, book, make_doc(), embed=None)

    assert result.status == "ingested"
    assert [row["embedding"] for row in store.chunks.values()] == [None, None]


def test_unchanged_file_is_skipped_without_extracting_again(book):
    store = InMemoryIngestStore()
    ingest(store, book, make_doc())

    result = ingest(store, book, make_doc(), embed=forbidden_embed, extract=forbidden_extract)

    assert result.status == "skipped"


def test_interrupted_ingestion_resumes_on_the_same_document(book):
    store = InMemoryIngestStore()
    document_id = store.save_document(
        {"content_hash": hashlib.sha256(b"livro v1").hexdigest(), "file_path": "economia/k.pdf", "metadata": {}}
    )
    store.upsert_chunks(document_id, [{"chunk_index": 0, "content": "parcial"}])

    result = ingest(store, book, make_doc())

    assert result.document_id == document_id
    assert len(store.documents) == 1
    assert store.documents[document_id]["processed_at"] is not None
    assert sorted(index for (_, index) in store.chunks) == [0, 1]


def test_changed_file_at_the_same_path_replaces_the_old_version(book):
    store = InMemoryIngestStore()
    first = ingest(store, book, make_doc(), result=extraction(("A", "a.", 1), ("B", "b.", 2), ("C", "c.", 3)))

    book.write_bytes(b"livro v2")
    second = ingest(store, book, make_doc(), result=extraction(("Único", "u.", 1)))

    assert second.document_id == first.document_id
    assert len(store.documents) == 1
    assert store.documents[first.document_id]["content_hash"] == hashlib.sha256(b"livro v2").hexdigest()
    assert sorted(index for (_, index) in store.chunks) == [0]
    assert [s["title"] for s in store.sections[first.document_id]] == ["Único"]


def test_same_file_under_another_path_is_reported_as_duplicate(book, tmp_path):
    copy = tmp_path / "copia.pdf"
    shutil.copy(book, copy)
    store = InMemoryIngestStore()
    ingest(store, book, make_doc())

    result = ingest(store, copy, make_doc(path="outra/copia.pdf"), embed=forbidden_embed, extract=forbidden_extract)

    assert result.status == "duplicate"
    assert len(store.documents) == 1


def test_changing_the_manifest_entry_reprocesses_the_document(book):
    store = InMemoryIngestStore()
    ingest(store, book, make_doc())

    result = ingest(store, book, make_doc(**MAPPED))

    assert result.status == "ingested"
    assert store.chunks[(result.document_id, 0)]["topic_id"] == "t33"


def test_a_new_answer_key_reprocesses_the_exam(book):
    store = InMemoryIngestStore()
    ingest(store, book, make_doc(doc_type="past_exam"), answer_key_hash="gabarito-v1")

    result = ingest(store, book, make_doc(doc_type="past_exam"), answer_key_hash="gabarito-v2")

    assert result.status == "ingested"


def test_reprocess_option_forces_a_new_pass(book):
    store = InMemoryIngestStore()
    ingest(store, book, make_doc())
    calls = []

    result = ingest(store, book, make_doc(), embed=recording_embed(calls), reprocess=True)

    assert result.status == "ingested"
    assert len(calls) == 1


def test_dry_run_neither_embeds_nor_writes(book):
    store = InMemoryIngestStore()

    result = ingest(store, book, make_doc(), embed=forbidden_embed, dry_run=True)

    assert (result.status, result.section_count) == ("dry_run", 2)
    assert [record.chunk_index for record in result.records] == [0, 1]
    assert store.documents == {}


def test_document_without_extractable_text_writes_nothing(tmp_path):
    scanned = tmp_path / "digitalizado.pdf"
    scanned.write_bytes(b"so imagens")
    store = InMemoryIngestStore()

    result = ingest(store, scanned, make_doc(), result=Extraction(sections=[]), embed=forbidden_embed)

    assert result.status == "empty"
    assert store.documents == {}


def test_topic_chosen_by_hand_survives_a_new_extraction(book):
    store = InMemoryIngestStore()
    first = ingest(store, book, make_doc())
    store.sections[first.document_id][1].update(topic_id="t33", topic_assigned_by="manual")

    ingest(store, book, make_doc(), reprocess=True)

    second_section = store.sections[first.document_id][1]
    assert (second_section["topic_id"], second_section["topic_assigned_by"]) == ("t33", "manual")
    assert store.chunks[(first.document_id, 1)]["topic_id"] == "t33"


def test_figures_go_to_the_store_with_the_section_that_shows_them(book):
    figure = DocElement(kind="picture", text="Figura 1: a curva IS", page=30, asset_key="fig-0001")
    image = AssetFile(key="fig-0001", kind="figure", data=b"\x89PNG", content_type="image/png", width=640, height=480, page=30, caption="Figura 1: a curva IS")
    store = InMemoryIngestStore()

    result = ingest(
        store, book, make_doc(), result=extraction(("Um", "Um.", 12), ("Dois", "Dois.", 30), assets=[image], extra_elements=[figure])
    )

    [row] = store.assets[result.document_id]
    assert (row["key"], row["position"], row["section_position"], row["data"]) == ("fig-0001", 0, 1, b"\x89PNG")


def test_the_exam_is_imported_together_with_its_document(book):
    draft = ExamDraft(stems=[ExamStem(number=1, text="Julgue.", page=1, items=(ExamItem(1, "Item.", 1, answer="C"),))])
    store = InMemoryIngestStore()

    result = ingest(store, book, make_doc(doc_type="past_exam"), result=extraction(("Questão 1", "Julgue.", 1), exam=draft))

    assert store.exams[result.document_id] is draft


# --- Síntese -----------------------------------------------------------------------


def three_rows(topic):
    return [rpc_row("c1"), rpc_row("c2"), rpc_row("c3")]


def forbidden_generate(system_prompt, user_prompt):
    raise AssertionError("não deveria chamar o modelo")


def synthesize(store, retrieve=three_rows, generate=forbidden_generate, **options):
    return synthesize_topic(topic=TOPIC, subject=SUBJECT, store=store, retrieve=retrieve, generate=generate, **options)


def test_existing_lesson_is_kept_unless_forced():
    store = RecordingSynthesisStore(has_lesson=True)

    result = synthesize(store, retrieve=lambda topic: pytest.fail("não deveria buscar"))

    assert result.status == "exists"
    assert store.saved == []


def test_forced_synthesis_replaces_an_existing_lesson():
    store = RecordingSynthesisStore(has_lesson=True)

    result = synthesize(store, generate=lambda system, user: make_package(), force=True)

    assert result.status == "saved"
    assert len(store.saved) == 1


def test_topic_with_too_little_acervo_is_not_sent_to_the_model():
    store = RecordingSynthesisStore()

    result = synthesize(store, retrieve=lambda topic: [rpc_row("c1")])

    assert result.status == "insufficient"
    assert store.saved == []


def test_model_reporting_insufficient_acervo_saves_nothing():
    store = RecordingSynthesisStore()
    package = make_package(acervo_suficiente=False, coverage_gaps=["Trindade impossível"])

    result = synthesize(store, generate=lambda system, user: package)

    assert result.status == "insufficient"
    assert result.gaps == ["Trindade impossível"]
    assert store.saved == []


def test_ungrounded_package_is_rejected():
    store = RecordingSynthesisStore()

    result = synthesize(store, generate=lambda system, user: make_package(cacd_deep_dive_md="Afirmação [9]."))

    assert result.status == "invalid"
    assert result.errors
    assert store.saved == []


def test_grounded_package_is_saved_with_sources_and_chunk_links():
    store = RecordingSynthesisStore()
    prompts = []

    def generate(system_prompt, user_prompt):
        prompts.append(user_prompt)
        return make_package()

    result = synthesize(store, generate=generate)

    assert result.status == "saved"
    assert "[2] Fonte: rótulo c2\nconteúdo c2" in prompts[0]
    [saved] = store.saved
    assert saved["lesson"]["topic_id"] == "t33"
    assert saved["lesson"]["base_intuition_md"].endswith("**Fontes do acervo**\n\n- [1] rótulo c1")
    assert saved["lesson"]["tps_traps_json"] == [
        {"wrong_claim": "x", "truth_mechanism": "y", "trap_category": "Inversão causal", "sources": ["rótulo c2"]}
    ]
    assert saved["flashcards"] == [
        {"topic_id": "t33", "origin": "pre_processed", "front_prompt": "p", "back_answer": "r"}
    ]
    assert saved["tps_items"][0]["source_chunk_id"] == "c2"
    assert saved["tps_items"][0]["official_answer"] == "E"
    assert "Mundell-Fleming" in saved["stem_text"]


def test_dry_run_shows_the_blocks_without_calling_the_model():
    store = RecordingSynthesisStore()

    result = synthesize(store, dry_run=True)

    assert result.status == "dry_run"
    assert [block.chunk_id for block in result.blocks] == ["c1", "c2", "c3"]
    assert store.saved == []
