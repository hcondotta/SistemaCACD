"""Provas: itens C/E no formato do Cebraspe, gabarito, discursivas e o arquivo de revisão."""

import pytest

from cacd_factory.exams import (
    apply_answer_key,
    exam_sections,
    parse_answer_key,
    parse_exam,
    render_exam_review,
    stale_exam_items,
    subject_for_header,
)

HEADER = "CEBRASPE – CACD – Aplicação: 2024"
OBJECTIVE_PAGES = [
    HEADER + "\nPROVA OBJETIVA\nTexto 1A1-I\nA economia brasileira cresceu em 2023.\n"
    "Com base no texto 1A1-I, julgue os itens a seguir.\n"
    "1 O crescimento descrito no texto\ndecorreu da expansão fiscal.\n"
    "2 A inflação ficou abaixo da meta.\n"
    "Acerca do balanço de pagamentos,\njulgue os itens subsequentes.\n"
    "3 O déficit em transações correntes é financiado pela conta financeira.\n– 1 –",
    HEADER + "\n4 Reservas internacionais compõem a conta financeira.\n– 2 –",
]


def test_items_are_grouped_under_the_instruction_that_introduces_them():
    draft = parse_exam(OBJECTIVE_PAGES)

    assert [(stem.number, [item.number for item in stem.items]) for stem in draft.stems] == [(1, [1, 2]), (2, [3, 4])]
    assert draft.stems[0].text == (
        "Texto 1A1-I\nA economia brasileira cresceu em 2023.\nCom base no texto 1A1-I, julgue os itens a seguir."
    )
    assert draft.stems[1].text == "Acerca do balanço de pagamentos,\njulgue os itens subsequentes."


def test_item_statements_join_their_wrapped_lines_and_keep_their_page():
    draft = parse_exam(OBJECTIVE_PAGES)
    first = draft.stems[0].items[0]
    last = draft.stems[1].items[-1]

    assert first.statement == "O crescimento descrito no texto decorreu da expansão fiscal."
    assert (first.page, last.page) == (1, 2)
    assert last.statement == "Reservas internacionais compõem a conta financeira."


def test_running_headers_and_page_numbers_are_dropped():
    draft = parse_exam(OBJECTIVE_PAGES)
    everything = " ".join(
        [stem.text for stem in draft.stems] + [item.statement for stem in draft.stems for item in stem.items]
    )

    assert "CEBRASPE – CACD" not in everything
    assert "– 1 –" not in everything


def test_question_headers_define_stems_and_numbering_may_restart():
    pages = [
        "QUESTÃO 1\nAcerca da política monetária, julgue (C ou E) os itens a seguir.\n"
        "1 A Selic é a taxa básica.\n2 O compulsório é instrumento monetário.\n"
        "QUESTÃO 2\nSobre o câmbio, julgue (C ou E) os itens a seguir.\n1 Câmbio fixo exige reservas.\n"
    ]

    draft = parse_exam(pages)

    assert [(stem.number, [item.key for item in stem.items]) for stem in draft.stems] == [
        (1, ["1.1", "1.2"]),
        (2, ["2.1"]),
    ]


def test_answer_key_pairs_numbers_and_letters_on_the_same_line():
    assert parse_answer_key("1 C 2 E 3 X 4 C") == {"1": "C", "2": "E", "3": "X", "4": "C"}


def test_answer_key_grid_with_a_row_of_items_and_a_row_of_answers():
    text = "Item 1 2 3 4 5\nGabarito C E X C E\nItem 6 7\nGabarito E C"

    assert parse_answer_key(text) == {"1": "C", "2": "E", "3": "X", "4": "C", "5": "E", "6": "E", "7": "C"}


def test_annulled_marks_and_per_question_keys_are_understood():
    assert parse_answer_key("1 C 2 * 3.1 E 3.2 Anulado") == {"1": "C", "2": "X", "3.1": "E", "3.2": "X"}


def test_answers_are_applied_and_problems_reported():
    draft = apply_answer_key(parse_exam(OBJECTIVE_PAGES), {"1": "C", "2": "E", "3": "X"})

    assert [item.answer for stem in draft.stems for item in stem.items] == ["C", "E", "X", None]
    assert any("4" in warning and "gabarito" in warning for warning in draft.warnings)
    assert any("3" in warning and "anulado" in warning for warning in draft.warnings)


def test_discursive_questions_keep_lines_and_points():
    pages = [
        "QUESTÃO 1\nDisserte sobre a política externa brasileira no século XXI.\n"
        "Extensão máxima: 90 linhas\n(valor: 30,00 pontos)\n"
        "QUESTÃO 2\nAnalise o Plano Real.\nExtensão máxima: 60 linhas\n[valor: 20,00 pontos]\n"
    ]

    draft = parse_exam(pages)

    assert draft.stems == []
    assert [(essay.number, essay.text, essay.max_lines, essay.max_score) for essay in draft.essays] == [
        (1, "Disserte sobre a política externa brasileira no século XXI.", 90, 30.0),
        (2, "Analise o Plano Real.", 60, 20.0),
    ]


def test_exam_without_any_recognizable_item_is_reported():
    draft = parse_exam(["Página de rosto sem nenhuma questão."])

    assert draft.stems == []
    assert draft.essays == []
    assert draft.warnings


@pytest.mark.parametrize(
    "line, expected",
    [
        ("LÍNGUA PORTUGUESA", "portugues"),
        ("NOÇÕES DE ECONOMIA", "economia"),
        ("HISTÓRIA DO BRASIL", "historia-do-brasil"),
        ("DIREITO INTERNACIONAL PÚBLICO", "direito-internacional"),
        ("NOÇÕES DE DIREITO", "direito-interno"),
        ("Economia", None),  # título de disciplina vem em caixa alta e sozinho na linha
        ("A ECONOMIA BRASILEIRA CRESCEU MUITO NAQUELE ANO, SEGUNDO O TEXTO APRESENTADO ACIMA", None),
    ],
)
def test_subject_headers_of_the_exam_book_are_recognized(line, expected):
    assert subject_for_header(line) == expected


def test_each_question_takes_the_subject_of_the_block_it_is_in():
    pages = [
        "LÍNGUA PORTUGUESA\nJulgue os itens a seguir.\n1 A vírgula está correta.\n"
        "ECONOMIA\nAcerca da IS-LM, julgue os itens a seguir.\n2 A IS é negativamente inclinada.\n"
    ]

    draft = parse_exam(pages)

    assert [(stem.number, stem.subject) for stem in draft.stems] == [(1, "portugues"), (2, "economia")]
    assert draft.stems[1].text == "Acerca da IS-LM, julgue os itens a seguir."


def test_exam_sections_keep_only_the_document_subject_and_hide_the_answers():
    pages = [
        "LÍNGUA PORTUGUESA\nJulgue os itens a seguir.\n1 A vírgula está correta.\n"
        "ECONOMIA\nAcerca da IS-LM, julgue os itens a seguir.\n2 A IS é negativamente inclinada.\n"
    ]
    draft = apply_answer_key(parse_exam(pages), {"1": "C", "2": "C"})

    sections = exam_sections(draft, subject="economia")

    assert [section.title for section in sections] == ["Questão 2"]
    assert sections[0].content_md == "Acerca da IS-LM, julgue os itens a seguir.\n\n- **2.** A IS é negativamente inclinada."


def test_stale_items_without_attempts_are_the_only_ones_removed():
    existing = [
        {"id": "a", "stem_id": "s1", "item_number": 1},
        {"id": "b", "stem_id": "s1", "item_number": 2},
        {"id": "c", "stem_id": "s1", "item_number": 3},
    ]

    removed = stale_exam_items(existing, kept={("s1", 1)}, attempted_item_ids={"b"})

    assert removed == ["c"]


def test_review_file_shows_questions_items_answers_and_warnings():
    draft = apply_answer_key(parse_exam(OBJECTIVE_PAGES), {"1": "C", "2": "E", "3": "C"})

    review = render_exam_review(draft, title="CACD 2024")

    assert review.startswith("# Revisão: CACD 2024")
    assert "## Questão 1 (p. 1)" in review
    assert "- **1** [C] O crescimento descrito no texto decorreu da expansão fiscal." in review
    assert "- **4** [sem gabarito] Reservas internacionais compõem a conta financeira." in review
    assert "## Avisos" in review
