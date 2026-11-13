"""Trechos do acervo: rótulo de citação, cabeçalho contextual e corte sem perder texto."""

import pytest

from cacd_factory.chunking import (
    ExtractedBlock,
    build_chunk_records,
    build_citation_label,
    build_contextual_content,
    format_pages,
    format_timestamp,
)
from cacd_factory.domain import TopicInfo
from cacd_factory.manifest import ManifestDocument


@pytest.mark.parametrize(
    "pages, expected",
    [((), ""), ((7,), "p. 7"), ((7, 8), "pp. 7–8"), ((9, 7, 8), "pp. 7–9")],
)
def test_format_pages(pages, expected):
    assert format_pages(pages) == expected


@pytest.mark.parametrize("seconds, expected", [(0, "00:00"), (75.9, "01:15"), (3725, "1:02:05")])
def test_format_timestamp(seconds, expected):
    assert format_timestamp(seconds) == expected


def test_book_citation_names_author_work_edition_section_and_pages():
    block = ExtractedBlock(
        text="...",
        headings=("Parte IV", "Política fiscal sob câmbio flutuante"),
        pages=(512, 513, 514),
    )

    label = build_citation_label(title="Economia Internacional", author="Krugman e Obstfeld", edition="10ª ed.", block=block)

    assert label == "Krugman e Obstfeld — Economia Internacional (10ª ed.), “Política fiscal sob câmbio flutuante”, pp. 512–514"


def test_citation_without_author_or_section_keeps_work_and_page():
    label = build_citation_label(title="Apostila de Macro", author=None, edition=None, block=ExtractedBlock(text="...", pages=(33,)))

    assert label == "Apostila de Macro, p. 33"


def test_long_section_titles_are_shortened_in_the_citation():
    heading = "Uma seção com um título realmente muito longo " * 4
    block = ExtractedBlock(text="x", headings=(heading,))

    label = build_citation_label(title="Obra", author="Autor", edition=None, block=block)

    section = label.split("“")[1].split("”")[0]
    assert len(section) <= 80
    assert section.endswith("…")


def test_video_citation_uses_the_time_range_instead_of_pages():
    block = ExtractedBlock(text="...", start_seconds=750, end_seconds=1125)

    label = build_citation_label(title="Aula 3 — IS-LM", author="Prof. Fulano", edition=None, block=block)

    assert label == "Prof. Fulano — Aula 3 — IS-LM, 12:30–18:45"


def test_contextual_content_names_subject_topic_and_source():
    topic = TopicInfo(id="t1", code="3.3", title="Mundell-Fleming")

    content = build_contextual_content(subject_name="Economia", topic=topic, citation_label="K — EI, p. 5", text="Texto.")

    assert content == "[Disciplina: Economia | Tópico 3.3: Mundell-Fleming | Fonte: K — EI, p. 5]\nTexto."


def test_contextual_content_without_topic_omits_the_topic_part():
    content = build_contextual_content(subject_name="Economia", topic=None, citation_label="K — EI, p. 5", text="Texto.")

    assert content == "[Disciplina: Economia | Fonte: K — EI, p. 5]\nTexto."


def make_doc():
    return ManifestDocument.model_validate(
        {
            "path": "k.pdf",
            "title": "EI",
            "author": "K",
            "topic_pages": [{"pages": "10-20", "topic": "3.3"}],
        }
    )


def test_chunk_records_are_indexed_tagged_by_topic_and_skip_blank_blocks():
    topics = {"3.3": TopicInfo(id="t33", code="3.3", title="Mundell-Fleming")}
    blocks = [
        ExtractedBlock(text="Primeiro.", pages=(12,)),
        ExtractedBlock(text="   ", pages=(13,)),
        ExtractedBlock(text="Fora.", pages=(40,)),
    ]

    records = build_chunk_records(make_doc(), blocks, subject_name="Economia", topics=topics)

    assert [(r.chunk_index, r.topic_id) for r in records] == [(0, "t33"), (1, None)]
    assert records[0].citation_label == "K — EI, p. 12"
    assert records[0].content == "[Disciplina: Economia | Tópico 3.3: Mundell-Fleming | Fonte: K — EI, p. 12]\nPrimeiro."
    assert records[1].metadata == {"pages": [40]}


def test_topic_code_missing_from_the_database_is_an_error():
    with pytest.raises(ValueError, match="3.3"):
        build_chunk_records(make_doc(), [ExtractedBlock(text="Texto.", pages=(12,))], subject_name="Economia", topics={})
