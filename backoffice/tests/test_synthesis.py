"""Síntese da ficha: só o que está no acervo, com citação [n] verificável."""

import pytest

from cacd_factory.domain import TopicInfo
from cacd_factory.synthesis import (
    MIN_SOURCE_BLOCKS,
    LessonPackage,
    SourceBlock,
    build_user_prompt,
    cited_numbers,
    empty_stems,
    flashcards_to_replace,
    has_enough_sources,
    merge_retrieved,
    render_layer,
    to_source_blocks,
    tps_items_to_replace,
    validate_package,
)


def make_blocks(count):
    return [
        SourceBlock(number=i, chunk_id=f"c{i}", citation_label=f"Autor — Obra, p. {i}", content=f"Conteúdo {i}.")
        for i in range(1, count + 1)
    ]


def make_package(**overrides):
    data = {
        "acervo_suficiente": True,
        "coverage_gaps": [],
        "base_intuition_md": "A curva IS mostra o equilíbrio do mercado de bens [1].",
        "cacd_deep_dive_md": "Sob câmbio flutuante, a política fiscal é ineficaz [2][3].",
        "tps_traps": [
            {"wrong_claim": "x", "truth_mechanism": "y", "trap_category": "Inversão causal", "source_blocks": [2]}
        ],
        "essay_repertoire": [
            {
                "author_or_source": "Mundell",
                "core_thesis": "t",
                "historical_data_or_milestone": "1963",
                "source_blocks": [3],
            }
        ],
        "initial_flashcards": [{"front_prompt": "p", "back_answer": "r", "source_blocks": [1]}],
        "generated_tps_items": [
            {
                "statement": "s",
                "official_answer": "E",
                "detailed_explanation_md": "e [2]",
                "trap_category": "c",
                "source_block": 2,
            }
        ],
    }
    data.update(overrides)
    return LessonPackage.model_validate(data)


def rpc_row(chunk_id):
    """Linha com o mesmo formato que a RPC hybrid_search_chunks devolve."""
    return {
        "chunk_id": chunk_id,
        "content": f"conteúdo {chunk_id}",
        "citation_label": f"rótulo {chunk_id}",
        "doc_title": "Obra",
        "doc_type": "book",
        "rrf_score": 0.03,
    }


# --- Citações ------------------------------------------------------------------


@pytest.mark.parametrize(
    "markdown, expected",
    [
        ("Texto [1] e [2, 3].", {1, 2, 3}),
        ("Faixa [4–6] e [8-9].", {4, 5, 6, 8, 9}),
        ("Junto [1][2].", {1, 2}),
        ("Link [veja aqui](https://x.y) e [3](https://z.w).", set()),
        ("Sem citação nenhuma.", set()),
    ],
)
def test_cited_numbers(markdown, expected):
    assert cited_numbers(markdown) == expected


def test_a_grounded_package_has_no_errors():
    assert validate_package(make_package(), block_count=3) == []


def test_citation_to_a_block_that_was_not_given_is_an_error():
    errors = validate_package(make_package(cacd_deep_dive_md="Afirmação [7]."), block_count=3)

    assert any("cacd_deep_dive_md" in e and "[7]" in e for e in errors)


def test_layer_without_any_citation_is_an_error():
    errors = validate_package(make_package(base_intuition_md="Texto solto, sem fonte."), block_count=3)

    assert any("base_intuition_md" in e for e in errors)


def test_tps_item_pointing_outside_the_blocks_is_an_error():
    package = make_package(
        generated_tps_items=[
            {"statement": "s", "official_answer": "C", "detailed_explanation_md": "e [1]", "trap_category": "c", "source_block": 9}
        ]
    )

    assert validate_package(package, block_count=3) != []


def test_trap_without_a_source_is_an_error():
    package = make_package(
        tps_traps=[{"wrong_claim": "x", "truth_mechanism": "y", "trap_category": "z", "source_blocks": []}]
    )

    assert validate_package(package, block_count=3) != []


# --- Ficha renderizada -----------------------------------------------------------


def test_rendered_layer_lists_only_the_cited_sources_in_order():
    rendered = render_layer("Texto [3] e [1].", make_blocks(3), gaps=[])

    assert rendered == (
        "Texto [3] e [1].\n\n---\n\n**Fontes do acervo**\n\n"
        "- [1] Autor — Obra, p. 1\n- [3] Autor — Obra, p. 3"
    )


def test_rendered_layer_declares_points_not_covered_by_the_acervo():
    rendered = render_layer("Texto [1].", make_blocks(1), gaps=["Armadilha da liquidez"])

    assert rendered == (
        "Texto [1].\n\n---\n\n**Não coberto pelo acervo**\n\n- Armadilha da liquidez\n\n"
        "**Fontes do acervo**\n\n- [1] Autor — Obra, p. 1"
    )


# --- Recuperação --------------------------------------------------------------------


def test_merged_results_keep_topic_hits_first_and_drop_duplicates():
    merged = merge_retrieved([rpc_row("a"), rpc_row("b")], [rpc_row("b"), rpc_row("c")], limit=10)

    assert [row["chunk_id"] for row in merged] == ["a", "b", "c"]


def test_merged_results_respect_the_limit():
    merged = merge_retrieved([rpc_row("a"), rpc_row("b")], [rpc_row("c")], limit=2)

    assert [row["chunk_id"] for row in merged] == ["a", "b"]


def test_source_blocks_are_numbered_from_one_in_retrieval_order():
    blocks = to_source_blocks([rpc_row("x"), rpc_row("y")])

    assert [(b.number, b.chunk_id, b.citation_label) for b in blocks] == [(1, "x", "rótulo x"), (2, "y", "rótulo y")]


def test_contextual_header_is_not_repeated_inside_the_block():
    row = {**rpc_row("x"), "content": "[Disciplina: Economia | Fonte: rótulo x]\nTexto do trecho."}

    [block] = to_source_blocks([row])

    assert block.content == "Texto do trecho."


def test_too_few_blocks_are_not_enough_to_write_a_lesson():
    assert has_enough_sources(make_blocks(MIN_SOURCE_BLOCKS - 1)) is False
    assert has_enough_sources(make_blocks(MIN_SOURCE_BLOCKS)) is True


def test_prompt_numbers_each_block_with_its_citation_label():
    topic = TopicInfo(id="t", code="3.3", title="Mundell-Fleming", official_edital_ref="Ponto 4")

    prompt = build_user_prompt(topic, make_blocks(2))

    assert "Tópico 3.3 — Mundell-Fleming (Ponto 4)" in prompt
    assert "[1] Fonte: Autor — Obra, p. 1\nConteúdo 1." in prompt
    assert "[2] Fonte: Autor — Obra, p. 2\nConteúdo 2." in prompt


# --- Substituição sem apagar o histórico dela ---------------------------------------


def test_only_untouched_preprocessed_flashcards_are_replaced():
    existing = [
        {"id": "f1", "origin": "pre_processed", "reps": 0},
        {"id": "f2", "origin": "pre_processed", "reps": 3},
        {"id": "f3", "origin": "manual", "reps": 0},
        {"id": "f4", "origin": "error_notebook", "reps": 0},
    ]

    assert flashcards_to_replace(existing) == ["f1"]


def test_only_ai_items_never_attempted_are_replaced():
    items = [
        {"id": "i1", "stem_id": "s1"},
        {"id": "i2", "stem_id": "s1"},
        {"id": "i3", "stem_id": "s2"},
    ]

    replaced = tps_items_to_replace(items, ai_stem_ids={"s1"}, attempted_item_ids={"i2"})

    assert replaced == ["i1"]


def test_stems_are_removed_only_when_no_item_is_left():
    remaining = [{"id": "i2", "stem_id": "s1"}]

    assert empty_stems({"s1", "s3"}, remaining_items=remaining) == ["s3"]
