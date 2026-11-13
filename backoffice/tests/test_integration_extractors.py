"""Integração: os extratores rodando de verdade (Docling e pypdfium2) sobre arquivos montados no teste.

Lentos (carregam o torch): rode com `pytest -m integration`.
"""

import ctypes

import pytest

from cacd_factory.extractors import FileExtractor
from cacd_factory.manifest import ManifestDocument

pytestmark = pytest.mark.integration


def extractor_for(folder):
    return FileExtractor(whisper_model="tiny", whisper_device="cpu", resolve=lambda stored: folder / stored)


def test_docx_book_keeps_headings_tables_and_figures(tmp_path):
    from docx import Document
    from docx.shared import Inches
    from PIL import Image, ImageDraw

    chart = Image.new("RGB", (400, 300), "white")
    ImageDraw.Draw(chart).line((20, 280, 380, 20), fill="black", width=6)
    chart.save(tmp_path / "grafico.png")

    book = Document()
    book.add_heading("Capítulo 1 — Demanda agregada", level=1)
    book.add_paragraph("A demanda agregada soma consumo, investimento, gastos do governo e exportações líquidas.")
    book.add_heading("1.1 Componentes", level=2)
    table = book.add_table(rows=2, cols=2)
    for (row, col), value in {(0, 0): "Componente", (0, 1): "Sigla", (1, 0): "Consumo", (1, 1): "C"}.items():
        table.cell(row, col).text = value
    book.add_picture(str(tmp_path / "grafico.png"), width=Inches(3))
    book.save(tmp_path / "livro.docx")

    result = extractor_for(tmp_path)(
        tmp_path / "livro.docx", ManifestDocument(path="livro.docx", title="Macro", doc_type="book")
    )

    titles = [section.title for section in result.sections]
    assert "Capítulo 1 — Demanda agregada" in titles
    assert "1.1 Componentes" in titles
    content = "\n".join(section.content_md for section in result.sections)
    assert "Componente" in content and "|" in content
    [figure] = result.assets
    assert figure.content_type == "image/webp"
    assert figure.data[:4] == b"RIFF"
    assert f"asset:{figure.key}" in content


def make_text_pdf(path, pages):
    """PDF com texto de verdade (camada de texto), escrito pela própria PDFium."""
    import pypdfium2 as pdfium
    import pypdfium2.raw as raw

    document = pdfium.PdfDocument.new()
    for lines in pages:
        page = document.new_page(595, 842)
        y = 800.0
        for line in lines:
            text_object = raw.FPDFPageObj_NewTextObj(document.raw, b"Helvetica", ctypes.c_float(11))
            encoded = ctypes.create_string_buffer((line + "\x00").encode("utf-16-le"))
            raw.FPDFText_SetText(text_object, ctypes.cast(encoded, ctypes.POINTER(raw.FPDF_WCHAR)))
            raw.FPDFPageObj_Transform(text_object, 1, 0, 0, 1, 40, y)
            raw.FPDFPage_InsertObject(page.raw, text_object)
            y -= 16
        raw.FPDFPage_GenerateContent(page.raw)
    document.save(str(path))


def test_exam_pdf_becomes_questions_with_their_answer_key(tmp_path):
    make_text_pdf(
        tmp_path / "prova.pdf",
        [
            [
                "CEBRASPE - CACD 2024",
                "ECONOMIA",
                "Acerca do modelo IS-LM, julgue os itens a seguir.",
                "1 A curva IS relaciona juros e renda no mercado de bens.",
                "2 A curva LM representa o equilibrio no mercado de bens.",
            ],
            ["CEBRASPE - CACD 2024", "3 Sob armadilha da liquidez, a politica monetaria perde eficacia."],
        ],
    )
    (tmp_path / "gabarito.txt").write_text("1 C 2 E 3 C", encoding="utf-8")
    document = ManifestDocument(path="prova.pdf", title="CACD 2024", doc_type="past_exam", answer_key="gabarito.txt")

    result = extractor_for(tmp_path)(tmp_path / "prova.pdf", document)

    [stem] = result.exam.stems
    assert stem.subject == "economia"
    assert [(item.number, item.answer) for item in stem.items] == [(1, "C"), (2, "E"), (3, "C")]
    assert result.stats["board"] == "Cebraspe"
    assert result.stats["year"] == 2024
    assert [section.title for section in result.sections] == ["Questão 1"]
    assert "Revisão: CACD 2024" in result.review_md
