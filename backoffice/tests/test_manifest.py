"""Manifesto bibliográfico: o que entra no acervo e a qual tópico cada página pertence."""

import pytest
from pydantic import ValidationError

from cacd_factory.manifest import (
    BibliographyManifest,
    ManifestDocument,
    add_scanned_files,
    load_manifest,
    parse_page_range,
    save_manifest,
)


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("120-145", (120, 145)),
        ("7", (7, 7)),
        ("120–145", (120, 145)),  # travessão, como o Word costuma gravar
        (" 3 - 9 ", (3, 9)),
    ],
)
def test_parse_page_range_accepts_common_spellings(raw, expected):
    assert parse_page_range(raw) == expected


@pytest.mark.parametrize("raw", ["10-5", "0", "abc", "", "3-", "-4"])
def test_parse_page_range_rejects_invalid_ranges(raw):
    with pytest.raises(ValueError):
        parse_page_range(raw)


def make_doc(**overrides):
    data = {"path": "Krugman.pdf", "title": "Economia Internacional"}
    data.update(overrides)
    return ManifestDocument.model_validate(data)


def test_page_inside_a_mapped_range_gets_that_topic():
    doc = make_doc(topic="3.1", topic_pages=[{"pages": "480-530", "topic": "3.3"}])

    assert doc.topic_for_pages((500, 501)) == "3.3"


def test_page_outside_every_range_falls_back_to_the_document_topic():
    doc = make_doc(topic="3.1", topic_pages=[{"pages": "480-530", "topic": "3.3"}])

    assert doc.topic_for_pages((12,)) == "3.1"


def test_unmapped_page_without_a_document_topic_has_no_topic():
    doc = make_doc(topic_pages=[{"pages": "480-530", "topic": "3.3"}])

    assert doc.topic_for_pages((12,)) is None


def test_block_without_pages_uses_the_document_topic():
    doc = make_doc(topic="2.4", topic_pages=[{"pages": "1-10", "topic": "2.2"}])

    assert doc.topic_for_pages(()) == "2.4"


def test_first_page_of_a_block_decides_between_adjacent_ranges():
    doc = make_doc(
        topic_pages=[{"pages": "120-145", "topic": "2.3"}, {"pages": "146-170", "topic": "2.4"}],
    )

    assert doc.topic_for_pages((145, 146)) == "2.3"


def test_overlapping_page_ranges_are_rejected():
    with pytest.raises(ValidationError):
        make_doc(topic_pages=[{"pages": "100-150", "topic": "2.3"}, {"pages": "150-170", "topic": "2.4"}])


@pytest.mark.parametrize("weight", [0, 11])
def test_authority_weight_outside_1_to_10_is_rejected(weight):
    with pytest.raises(ValidationError):
        make_doc(authority_weight=weight)


def test_unknown_field_is_rejected_to_catch_typos():
    with pytest.raises(ValidationError):
        make_doc(titel="Erro de digitação")


def test_duplicate_paths_are_rejected_even_with_other_case_and_slashes():
    with pytest.raises(ValidationError):
        BibliographyManifest.model_validate(
            {
                "documents": [
                    {"path": "economia/Livro.pdf", "title": "A"},
                    {"path": "economia\\livro.PDF", "title": "B"},
                ]
            }
        )


def test_relative_path_is_resolved_against_an_absolute_library_root(tmp_path):
    manifest = BibliographyManifest.model_validate(
        {
            "library_root": str(tmp_path / "acervo"),
            "documents": [{"path": "economia/Krugman.pdf", "title": "K"}],
        }
    )

    resolved = manifest.resolve_path(manifest.documents[0], manifest_dir=tmp_path / "outro-lugar")

    assert resolved == tmp_path / "acervo" / "economia" / "Krugman.pdf"


def test_relative_library_root_is_relative_to_the_manifest_folder(tmp_path):
    manifest = BibliographyManifest.model_validate(
        {"library_root": "acervo", "documents": [{"path": "Krugman.pdf", "title": "K"}]}
    )

    assert manifest.resolve_path(manifest.documents[0], manifest_dir=tmp_path) == tmp_path / "acervo" / "Krugman.pdf"


def test_without_library_root_paths_are_relative_to_the_manifest_folder(tmp_path):
    manifest = BibliographyManifest.model_validate({"documents": [{"path": "Krugman.pdf", "title": "K"}]})

    assert manifest.resolve_path(manifest.documents[0], manifest_dir=tmp_path) == tmp_path / "Krugman.pdf"


def test_absolute_document_path_ignores_the_library_root(tmp_path):
    absolute = tmp_path / "outro" / "Furtado.pdf"
    manifest = BibliographyManifest.model_validate(
        {"library_root": "acervo", "documents": [{"path": str(absolute), "title": "F"}]}
    )

    assert manifest.resolve_path(manifest.documents[0], manifest_dir=tmp_path) == absolute


# --- Varredura de pasta (comando scan) -------------------------------------------


def scanned(root, *relative_names):
    return [root / name for name in relative_names]


def test_new_files_are_added_with_guessed_metadata(tmp_path):
    files = scanned(
        tmp_path,
        "Krugman - Economia Internacional.pdf",
        "aulas/Aula 03 IS-LM.mp4",
        "notas/fichamento_bp.md",
    )

    manifest, added = add_scanned_files(BibliographyManifest(), files, root=tmp_path, subject="economia")

    assert [(d.path, d.author, d.title, d.doc_type) for d in added] == [
        ("Krugman - Economia Internacional.pdf", "Krugman", "Economia Internacional", "book"),
        ("aulas/Aula 03 IS-LM.mp4", None, "Aula 03 IS-LM", "video_transcript"),
        ("notas/fichamento_bp.md", None, "fichamento bp", "personal_note"),
    ]
    assert len(manifest.documents) == 3


def test_files_already_in_the_manifest_are_kept_untouched(tmp_path):
    current = BibliographyManifest.model_validate(
        {
            "library_root": tmp_path.as_posix(),
            "documents": [{"path": "krugman - economia internacional.PDF", "title": "Título que ela corrigiu"}],
        }
    )

    manifest, added = add_scanned_files(
        current, scanned(tmp_path, "Krugman - Economia Internacional.pdf"), root=tmp_path, subject="economia"
    )

    assert added == []
    assert [d.title for d in manifest.documents] == ["Título que ela corrigiu"]


def test_unsupported_files_are_ignored_by_the_scan(tmp_path):
    manifest, added = add_scanned_files(
        BibliographyManifest(), scanned(tmp_path, "foto.jpg", "planilha.xlsx"), root=tmp_path, subject="economia"
    )

    assert added == []
    assert manifest.documents == []


def test_first_scan_sets_the_library_root(tmp_path):
    manifest, _ = add_scanned_files(BibliographyManifest(), scanned(tmp_path, "a.pdf"), root=tmp_path, subject="economia")

    assert manifest.library_root == tmp_path.as_posix()


def test_scan_of_another_folder_records_absolute_paths(tmp_path):
    current = BibliographyManifest.model_validate({"library_root": (tmp_path / "acervo").as_posix()})
    other = tmp_path / "pendrive"

    manifest, added = add_scanned_files(current, scanned(other, "Furtado.pdf"), root=other, subject="economia")

    assert added[0].path == (other / "Furtado.pdf").as_posix()
    assert manifest.resolve_path(added[0], manifest_dir=tmp_path) == other / "Furtado.pdf"


def test_inbox_scan_uses_the_folder_type_and_pairs_answer_keys(tmp_path):
    files = scanned(
        tmp_path,
        "livros/Krugman - Economia Internacional.pdf",
        "provas/2023/Caderno TPS.pdf",
        "provas/2023/Gabarito definitivo.pdf",
        "aulas/Aula 1.mp4",
    )

    _, added = add_scanned_files(BibliographyManifest(), files, root=tmp_path, subject="economia")

    assert [(d.path, d.doc_type, d.answer_key) for d in added] == [
        ("livros/Krugman - Economia Internacional.pdf", "book", None),
        ("provas/2023/Caderno TPS.pdf", "past_exam", "provas/2023/Gabarito definitivo.pdf"),
        ("aulas/Aula 1.mp4", "video_transcript", None),
    ]


def test_saved_manifest_loads_back_identical(tmp_path):
    original = BibliographyManifest.model_validate(
        {
            "library_root": "acervo",
            "documents": [
                {
                    "path": "Krugman.pdf",
                    "title": "Economia Internacional",
                    "author": "Krugman e Obstfeld",
                    "topic_pages": [{"pages": "480-530", "topic": "3.3"}],
                }
            ],
        }
    )
    target = tmp_path / "bibliography_manifest.json"

    save_manifest(original, target)

    assert load_manifest(target) == original
