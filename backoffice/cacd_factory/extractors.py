"""Extratores de arquivo: tudo roda no computador dela, sem serviço de IA externo.

- Livros, apostilas e editais (PDF, DOCX, PPTX, HTML): Docling — títulos, parágrafos, listas,
  tabelas, fórmulas e figuras, com o número da página de cada pedaço. OCR nas páginas digitalizadas.
- Anotações (MD, TXT): leitura direta.
- Aulas (vídeo ou áudio): legenda .srt/.vtt ao lado do arquivo quando houver; senão, Whisper local.
  Nos vídeos, um quadro de cada slide (lendo só os quadros-chave, o que é rápido).
- Provas (PDF): texto de cada página, itens C/E, gabarito e discursivas.

Os modelos pesados (Docling, Whisper) são carregados uma vez por execução e só quando aparece um
arquivo daquele tipo. Os pesos baixados ficam em HF_HOME, que a CLI aponta para backoffice/.cache.
"""

from __future__ import annotations

import io
import re
import time
from collections.abc import Callable
from dataclasses import replace
from pathlib import Path

from .exams import (
    apply_answer_key,
    exam_sections,
    parse_answer_key,
    parse_exam,
    read_pdf_pages,
    render_exam_review,
)
from .formats import kind_of
from .lessons import SlideDetector, lesson_sections, parse_subtitles
from .manifest import ManifestDocument
from .pipeline import AssetFile, Extraction
from .sections import DocElement, attach_loose_captions, build_sections, infer_heading_levels, markdown_elements

VIDEO_SUFFIXES = frozenset({".mp4", ".webm", ".mkv", ".mov"})
MIN_PICTURE_PIXELS = 64  # ícones e vinhetas menores que isso não são figura de estudo
SLIDE_SAMPLE_SECONDS = 2.0
SLIDE_MAX_WIDTH = 1280


def _webp(image, *, max_width: int | None = None, quality: int = 88) -> tuple[bytes, int, int]:
    if max_width and image.width > max_width:
        height = round(image.height * max_width / image.width)
        image = image.resize((max_width, height))
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=4)
    return buffer.getvalue(), image.width, image.height


def docling_elements(document) -> tuple[list[DocElement], list[AssetFile]]:
    """Percorre o DoclingDocument na ordem de leitura; cabeçalho, rodapé e legenda solta ficam de fora."""
    elements: list[DocElement] = []
    assets: list[AssetFile] = []
    for item, _level in document.iterate_items():
        label = str(item.label)
        provenance = getattr(item, "prov", None) or []
        page = provenance[0].page_no if provenance else None
        if label in ("page_header", "page_footer", "caption"):
            continue  # a legenda entra junto da figura ou da tabela a que pertence
        if label in ("title", "section_header"):
            elements.append(DocElement(kind="heading", text=item.text, level=getattr(item, "level", 1) or 1, page=page))
        elif label == "list_item":
            marker = getattr(item, "marker", "") if getattr(item, "enumerated", False) else ""
            elements.append(DocElement(kind="list_item", text=f"{marker} {item.text}".strip(), page=page))
        elif label == "code":
            elements.append(DocElement(kind="code", text=item.text, page=page))
        elif label == "formula":
            elements.append(DocElement(kind="formula", text=item.text, page=page))
        elif label == "table":
            markdown = item.export_to_markdown(doc=document)
            if markdown.strip():
                elements.append(DocElement(kind="table", text=markdown, page=page, caption=item.caption_text(document)))
        elif label in ("picture", "chart"):
            image = item.get_image(document)
            if image is None or min(image.size) < MIN_PICTURE_PIXELS:
                continue
            key = f"fig-{len(assets) + 1:04d}"
            caption = item.caption_text(document).strip()
            data, width, height = _webp(image)
            assets.append(AssetFile(key=key, kind="figure", data=data, content_type="image/webp", width=width, height=height, page=page, caption=caption or None))
            elements.append(DocElement(kind="picture", text=caption, page=page, asset_key=key))
        elif getattr(item, "text", "").strip():
            elements.append(DocElement(kind="text", text=item.text, page=page))
    return elements, assets


def _subtitle_for(media: Path) -> Path | None:
    """Legenda com o mesmo nome do vídeo (aceita sufixo de idioma: aula.pt-BR.vtt)."""
    stem = media.stem.casefold()
    for candidate in sorted(media.parent.iterdir()):
        if candidate.suffix.lower() in (".srt", ".vtt"):
            name = candidate.stem.casefold()
            if name == stem or name.startswith(stem + "."):
                return candidate
    return None


def _board(text: str) -> str | None:
    lowered = text.casefold()
    if "cebraspe" in lowered or "cespe" in lowered:
        return "Cebraspe"
    if "iades" in lowered:
        return "IADES"
    return None


def _year(*texts: str) -> int | None:
    for text in texts:
        found = re.findall(r"\b(19[89]\d|20[0-4]\d)\b", text)
        if found:
            return int(found[0])
    return None


class FileExtractor:
    def __init__(
        self,
        *,
        whisper_model: str,
        whisper_device: str,
        resolve: Callable[[str], Path],
        log: Callable[[str], None] = lambda message: None,
    ):
        self.whisper_model = whisper_model
        self.whisper_device = whisper_device
        self.resolve = resolve
        self.log = log
        self._converter = None
        self._whisper = None

    def __call__(self, path: Path, document: ManifestDocument) -> Extraction:
        kind = kind_of(path)
        if document.doc_type == "past_exam" and path.suffix.lower() == ".pdf":
            return self._exam(path, document)
        if kind == "text":
            text = path.read_text(encoding="utf-8", errors="replace")
            sections = build_sections(markdown_elements(text), document_title=document.title)
            return Extraction(sections=sections, stats={"extractor": "texto"})
        if kind == "media":
            return self._lesson(path)
        return self._document(path, document)

    # --- livros e apostilas ----------------------------------------------------
    def _document(self, path: Path, document: ManifestDocument) -> Extraction:
        if self._converter is None:
            from docling.datamodel.base_models import InputFormat
            from docling.datamodel.pipeline_options import PdfPipelineOptions
            from docling.document_converter import DocumentConverter, PdfFormatOption

            options = PdfPipelineOptions()
            options.generate_picture_images = True  # as figuras e gráficos dos livros viram imagem
            options.images_scale = 2.0
            self._converter = DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)})

        if path.suffix.lower() == ".pdf":
            self.log("Lendo o PDF com o Docling (cerca de 3 segundos por página)…")
        else:
            self.log("Lendo o documento com o Docling…")
        started = time.monotonic()
        converted = self._converter.convert(str(path)).document
        elements, assets = docling_elements(converted)
        if path.suffix.lower() == ".pdf":
            elements = infer_heading_levels(elements)
        elements = attach_loose_captions(elements)
        captions = {e.asset_key: e.text for e in elements if e.kind == "picture" and e.text}
        assets = [replace(asset, caption=captions.get(asset.key, asset.caption)) for asset in assets]
        stats = {
            "extractor": "docling",
            "pages": len(converted.pages),
            "tables": len(converted.tables),
            "figures": len(assets),
            "seconds": round(time.monotonic() - started, 1),
        }
        return Extraction(sections=build_sections(elements, document_title=document.title), assets=assets, stats=stats)

    # --- aulas -------------------------------------------------------------------
    def _lesson(self, path: Path) -> Extraction:
        subtitle = _subtitle_for(path)
        if subtitle is not None:
            self.log(f"Usando a legenda {subtitle.name}.")
            segments = parse_subtitles(subtitle.read_text(encoding="utf-8", errors="replace"))
            source = "legenda"
        else:
            segments = self._transcribe(path)
            source = "whisper"
        slides, assets = self._slides(path) if path.suffix.lower() in VIDEO_SUFFIXES else ([], [])
        duration = max((end for _, end, _ in segments), default=0.0)
        return Extraction(
            sections=lesson_sections(segments, slides=slides),
            assets=assets,
            stats={"extractor": source, "duration_seconds": round(duration, 1), "slides": len(assets)},
        )

    def _transcribe(self, path: Path) -> list[tuple[float, float, str]]:
        if self._whisper is None:
            from faster_whisper import WhisperModel

            self.log(f"Carregando o Whisper ({self.whisper_model}); na primeira vez ele baixa o modelo.")
            compute_type = "int8" if self.whisper_device == "cpu" else "auto"
            self._whisper = WhisperModel(self.whisper_model, device=self.whisper_device, compute_type=compute_type)
        segments, info = self._whisper.transcribe(str(path), language="pt", beam_size=5, vad_filter=True)
        result: list[tuple[float, float, str]] = []
        reported = 0
        for segment in segments:
            result.append((segment.start, segment.end, segment.text.strip()))
            if info.duration and segment.end / info.duration * 100 >= reported + 10:
                reported = int(segment.end / info.duration * 100) // 10 * 10
                self.log(f"Transcrição: {reported}%")
        return result

    def _slides(self, path: Path) -> tuple[list[tuple[float, str]], list[AssetFile]]:
        import av

        detector = SlideDetector()
        slides: list[tuple[float, str]] = []
        assets: list[AssetFile] = []
        next_sample = 0.0
        with av.open(str(path)) as container:
            stream = container.streams.video[0]
            stream.codec_context.skip_frame = "NONKEY"  # só quadros-chave: rápido e suficiente para slides
            for frame in container.decode(stream):
                if frame.pts is None:
                    continue
                timestamp = float(frame.pts * stream.time_base)
                if timestamp < next_sample:
                    continue
                next_sample = timestamp + SLIDE_SAMPLE_SECONDS
                image = frame.to_image()
                signature = [value / 255 for value in image.convert("L").resize((32, 18)).getdata()]
                if detector.offer(timestamp, signature):
                    key = f"slide-{len(assets) + 1:04d}"
                    data, width, height = _webp(image, max_width=SLIDE_MAX_WIDTH, quality=82)
                    assets.append(AssetFile(key=key, kind="slide", data=data, content_type="image/webp", width=width, height=height, at_seconds=round(timestamp, 2)))
                    slides.append((round(timestamp, 2), key))
        self.log(f"{len(assets)} slide(s) capturado(s).")
        return slides, assets

    # --- provas -------------------------------------------------------------------
    def _exam(self, path: Path, document: ManifestDocument) -> Extraction:
        pages = read_pdf_pages(path)
        draft = parse_exam(pages)
        if document.answer_key:
            key_path = self.resolve(document.answer_key)
            key_text = (
                "\n".join(read_pdf_pages(key_path))
                if key_path.suffix.lower() == ".pdf"
                else key_path.read_text(encoding="utf-8", errors="replace")
            )
            draft = apply_answer_key(draft, parse_answer_key(key_text))
        else:
            draft = replace(draft, warnings=[*draft.warnings, "Prova sem gabarito: os itens não entram no treino até o gabarito ser adicionado."])
        raw = "\n".join(pages[:2])
        stats = {
            "extractor": "provas",
            "pages": len(pages),
            "board": _board(raw),
            "year": _year(document.title, document.path, raw),
            "warnings": len(draft.warnings),
        }
        return Extraction(
            sections=exam_sections(draft, subject=document.subject),
            exam=draft,
            stats=stats,
            review_md=render_exam_review(draft, title=document.title),
        )
