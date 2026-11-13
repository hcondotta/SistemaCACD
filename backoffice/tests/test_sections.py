"""Seções legíveis: dos elementos de um documento (títulos, parágrafos, tabelas, figuras) à leitura."""

from cacd_factory.sections import (
    DocElement,
    attach_loose_captions,
    build_sections,
    document_markdown,
    infer_heading_levels,
    markdown_elements,
    section_blocks,
)


def test_markdown_notes_become_headings_paragraphs_and_lists():
    notes = "# IS-LM\n\nA IS mostra o mercado de bens.\n\n- consumo\n* investimento\n\n## Choques\nFiscal e monetário."

    elements = markdown_elements(notes)

    assert [(e.kind, e.text, e.level) for e in elements] == [
        ("heading", "IS-LM", 1),
        ("text", "A IS mostra o mercado de bens.", 1),
        ("list_item", "consumo", 1),
        ("list_item", "investimento", 1),
        ("heading", "Choques", 2),
        ("text", "Fiscal e monetário.", 1),
    ]


def test_document_markdown_lists_sections_with_their_location():
    sections = build_sections(
        [heading("Capítulo 1", page=3), text("Texto.", page=3), heading("1.1 IS", level=2, page=4), text("Mais.", page=5)],
        document_title="Macro",
    )

    assert document_markdown("Macro", sections) == (
        "# Macro\n\n## Capítulo 1\n\n_p. 3_\n\nTexto.\n\n### 1.1 IS\n\n_pp. 4–5_\n\nMais.\n"
    )


def picture(key="fig-0001", caption=""):
    return DocElement(kind="picture", text=caption, page=3, asset_key=key)


def test_loose_caption_below_a_picture_becomes_its_caption():
    elements = [picture(), text("Figura 2.1: equilíbrio IS-LM-BP", page=3), text("Texto normal.", page=3)]

    assert [(e.kind, e.text) for e in attach_loose_captions(elements)] == [
        ("picture", "Figura 2.1: equilíbrio IS-LM-BP"),
        ("text", "Texto normal."),
    ]


def test_caption_written_above_the_picture_is_also_attached():
    elements = [text("Gráfico 3 — curva de Phillips", page=3), picture(), text("Depois.", page=3)]

    assert [(e.kind, e.text) for e in attach_loose_captions(elements)] == [
        ("picture", "Gráfico 3 — curva de Phillips"),
        ("text", "Depois."),
    ]


def test_ordinary_text_is_never_taken_as_a_caption():
    elements = [picture(), text("A figura mostra o equilíbrio.", page=3)]

    assert attach_loose_captions(elements) == elements


def test_markdown_tables_keep_their_lines():
    elements = markdown_elements("| ano | PIB |\n|---|---|\n| 1999 | 0,5 |\n\nDepois da tabela.")

    assert [(e.kind, e.text) for e in elements] == [
        ("table", "| ano | PIB |\n|---|---|\n| 1999 | 0,5 |"),
        ("text", "Depois da tabela."),
    ]


def heading(text, level=1, page=1):
    return DocElement(kind="heading", text=text, level=level, page=page)


def text(value, page=1):
    return DocElement(kind="text", text=value, page=page)


def test_headings_open_sections_and_carry_the_heading_path():
    elements = [
        heading("Capítulo 5", level=1, page=98),
        heading("5.1 A curva IS", level=2, page=99),
        text("A curva IS mostra o equilíbrio no mercado de bens.", page=99),
        text("Quando os juros sobem, o investimento cai.", page=100),
        heading("5.2 A curva LM", level=2, page=101),
        text("A curva LM mostra o equilíbrio no mercado monetário.", page=101),
    ]

    sections = build_sections(elements, document_title="Macroeconomia")

    assert [(s.position, s.title, s.heading_path, s.page_start, s.page_end) for s in sections] == [
        (0, "5.1 A curva IS", ("Capítulo 5", "5.1 A curva IS"), 99, 100),
        (1, "5.2 A curva LM", ("Capítulo 5", "5.2 A curva LM"), 101, 101),
    ]
    assert sections[0].content_md == (
        "A curva IS mostra o equilíbrio no mercado de bens.\n\nQuando os juros sobem, o investimento cai."
    )
    assert sections[0].level == 2


def test_text_before_the_first_heading_opens_a_section_named_after_the_document():
    elements = [text("Nota do autor.", page=1), heading("Capítulo 1", page=2), text("Texto.", page=2)]

    sections = build_sections(elements, document_title="Macroeconomia")

    assert [(s.title, s.heading_path) for s in sections] == [("Macroeconomia", ()), ("Capítulo 1", ("Capítulo 1",))]


def test_lists_tables_and_formulas_keep_their_markdown():
    elements = [
        heading("Demanda agregada", page=3),
        DocElement(kind="list_item", text="Consumo", page=3),
        DocElement(kind="list_item", text="Investimento", page=3),
        DocElement(kind="table", text="| ano | PIB |\n|---|---|\n| 1999 | 0,5 |", page=3),
        DocElement(kind="formula", text="Y = C + I + G + (X - M)", page=4),
    ]

    [section] = build_sections(elements, document_title="Macro")

    assert section.content_md == (
        "- Consumo\n- Investimento\n\n| ano | PIB |\n|---|---|\n| 1999 | 0,5 |\n\n`Y = C + I + G + (X - M)`"
    )


def test_pictures_become_asset_references_with_their_caption():
    elements = [
        heading("Choques", page=7),
        DocElement(kind="picture", text="Figura 5.3: deslocamento da IS", page=7, asset_key="fig-001"),
        DocElement(kind="picture", text="", page=8, asset_key="fig-002"),
    ]

    [section] = build_sections(elements, document_title="Macro")

    assert section.content_md == (
        "![Figura 5.3: deslocamento da IS](asset:fig-001)\n\n![Figura da p. 8](asset:fig-002)"
    )
    assert section.asset_keys == ("fig-001", "fig-002")


def make_section(*elements):
    return build_sections([heading("Seção", page=10), *elements], document_title="Obra")[0]


def test_section_blocks_group_parts_up_to_the_limit_and_keep_their_pages():
    section = make_section(text("a" * 600, page=10), text("b" * 600, page=11), text("c" * 600, page=12))

    blocks = section_blocks(section, max_chars=1300)

    assert [(b.pages, len(b.text)) for b in blocks] == [((10, 11), 1202), ((12,), 600)]
    assert all(b.headings == ("Seção",) and b.section_position == 0 for b in blocks)


def test_picture_captions_are_searchable_but_image_references_are_not():
    section = make_section(
        text("A IS se desloca.", page=10),
        DocElement(kind="picture", text="Figura 5.3: deslocamento da IS", page=10, asset_key="fig-001"),
    )

    [block] = section_blocks(section, max_chars=1800)

    assert "Figura 5.3: deslocamento da IS" in block.text
    assert "asset:" not in block.text


def test_oversized_part_is_split_without_losing_text():
    long_paragraph = "Frase sobre o balanço de pagamentos. " * 60
    section = make_section(text(long_paragraph, page=10))

    blocks = section_blocks(section, max_chars=300)

    assert all(len(b.text) <= 300 for b in blocks)
    assert "".join(b.text for b in blocks).replace(" ", "") == long_paragraph.replace(" ", "")


# --- Hierarquia dos títulos (o Docling entrega todo título de PDF no nível 1) -----


def levels_of(*titles):
    elements = infer_heading_levels([heading(title) for title in titles])
    return [(element.text, element.level) for element in elements]


def test_numbered_headings_nest_by_their_numbering():
    assert levels_of("Capítulo 5", "5.1 A curva IS", "5.1.1 Inclinação", "5.2 A curva LM", "Capítulo 6") == [
        ("Capítulo 5", 1),
        ("5.1 A curva IS", 2),
        ("5.1.1 Inclinação", 3),
        ("5.2 A curva LM", 2),
        ("Capítulo 6", 1),
    ]


def test_unnumbered_headings_are_siblings_under_the_last_numbered_one():
    assert levels_of("5.1 A curva IS", "Exemplo resolvido", "Exercícios", "5.2 A curva LM") == [
        ("5.1 A curva IS", 2),
        ("Exemplo resolvido", 3),
        ("Exercícios", 3),
        ("5.2 A curva LM", 2),
    ]


def test_parts_sit_above_chapters():
    assert levels_of("Parte II", "Capítulo 5", "5.1 IS", "Capítulo 6") == [
        ("Parte II", 1),
        ("Capítulo 5", 2),
        ("5.1 IS", 3),
        ("Capítulo 6", 2),
    ]


def test_single_number_inside_a_chapter_is_a_section_of_it():
    assert levels_of("Capítulo 5", "1 Introdução", "2 O modelo") == [
        ("Capítulo 5", 1),
        ("1 Introdução", 2),
        ("2 O modelo", 2),
    ]


def test_markdown_hashes_in_the_heading_text_set_the_level_and_are_removed():
    assert levels_of("## 1. Visão Geral", "### Detalhe") == [("1. Visão Geral", 2), ("Detalhe", 3)]


def test_years_at_the_start_are_not_mistaken_for_numbering():
    assert levels_of("Capítulo 3", "1964: o PAEG") == [("Capítulo 3", 1), ("1964: o PAEG", 2)]
