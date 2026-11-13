"""Formatos aceitos: cada arquivo vai para o extrator certo, e o resto é recusado com clareza."""

from pathlib import Path

import pytest

from cacd_factory.formats import kind_of


@pytest.mark.parametrize(
    "name, expected",
    [
        ("Krugman.PDF", "document"),
        ("apostila.docx", "document"),
        ("slides.pptx", "document"),
        ("fichamento.md", "text"),
        ("notas.txt", "text"),
        ("aula.mp4", "media"),
        ("podcast.m4a", "media"),
    ],
)
def test_supported_files_go_to_their_extractor(name, expected):
    assert kind_of(Path(name)) == expected


@pytest.mark.parametrize("name", ["foto.jpg", "planilha.xlsx", "livro.epub", "sem-extensao"])
def test_unsupported_files_are_refused(name):
    with pytest.raises(ValueError, match="formato"):
        kind_of(Path(name))
