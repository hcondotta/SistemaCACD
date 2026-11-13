"""Pasta de entrada: a subpasta diz o tipo do arquivo e cada prova acha o seu gabarito."""

import pytest

from cacd_factory.inbox import doc_type_for_inbox_path, is_answer_key, pair_answer_keys


@pytest.mark.parametrize(
    "path, expected",
    [
        ("livros/Krugman.pdf", "book"),
        ("apostilas/Macro.pdf", "course_pdf"),
        ("aulas/Aula 1.mp4", "video_transcript"),
        ("provas/CACD 2023/caderno.pdf", "past_exam"),
        ("Anotações/fichamento.md", "personal_note"),
        ("edital/edital 2024.pdf", "official_syllabus"),
        ("solto.pdf", None),
        ("outra pasta/x.pdf", None),
    ],
)
def test_inbox_folder_decides_the_document_type(path, expected):
    assert doc_type_for_inbox_path(path) == expected


@pytest.mark.parametrize(
    "name, expected",
    [("CACD 2023 - Gabarito definitivo.pdf", True), ("gabarito_preliminar.PDF", True), ("Caderno de provas.pdf", False)],
)
def test_answer_keys_are_recognized_by_name(name, expected):
    assert is_answer_key(name) is expected


def test_each_exam_is_paired_with_the_answer_key_of_its_folder():
    exams = ["provas/2023/caderno.pdf", "provas/2022/prova.pdf"]
    keys = ["provas/2023/gabarito definitivo.pdf", "provas/2022/Gabarito.pdf"]

    assert pair_answer_keys(exams, keys) == {
        "provas/2023/caderno.pdf": "provas/2023/gabarito definitivo.pdf",
        "provas/2022/prova.pdf": "provas/2022/Gabarito.pdf",
    }


def test_with_several_exams_in_a_folder_the_key_is_matched_by_name():
    exams = ["provas/2023/TPS tipo A.pdf", "provas/2023/TPS tipo B.pdf"]
    keys = ["provas/2023/Gabarito TPS tipo B.pdf"]

    assert pair_answer_keys(exams, keys) == {"provas/2023/TPS tipo B.pdf": "provas/2023/Gabarito TPS tipo B.pdf"}
