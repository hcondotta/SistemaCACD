"""Aulas: legendas (.srt/.vtt), troca de slides e trechos da transcrição com minutagem."""

from __future__ import annotations

import re
from collections.abc import Iterable, Sequence

from .chunking import format_timestamp
from .sections import DocElement, Section

Segment = tuple[float, float, str]

_TIME = r"(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})"
_CUE = re.compile(rf"^\s*{_TIME}\s*-->\s*{_TIME}")
_TAG = re.compile(r"<[^>]+>")

DEFAULT_WINDOW_SECONDS = 300.0


def _seconds(hours: str | None, minutes: str, seconds: str, millis: str) -> float:
    return int(hours or 0) * 3600 + int(minutes) * 60 + int(seconds) + int(millis.ljust(3, "0")) / 1000


def parse_subtitles(text: str) -> list[Segment]:
    """Lê SRT e WebVTT. A legenda automática do YouTube repete a linha anterior: ela é descartada."""
    lines = text.replace("﻿", "").replace("\r\n", "\n").split("\n")
    segments: list[Segment] = []
    previous: list[str] = []
    index = 0
    while index < len(lines):
        cue = _CUE.match(lines[index])
        index += 1
        if not cue:
            continue
        start = _seconds(*cue.group(1, 2, 3, 4))
        end = _seconds(*cue.group(5, 6, 7, 8))
        current: list[str] = []
        while index < len(lines) and lines[index].strip():
            current.append(" ".join(_TAG.sub("", lines[index]).split()))
            index += 1
        fresh = [line for line in current if line and line not in previous]
        previous = current
        if fresh:
            segments.append((start, end, " ".join(fresh)))
    return segments


class SlideDetector:
    """Diz, amostra a amostra, quando começa um slide novo (para ler o vídeo sem guardá-lo na memória).

    Compara com o 1º quadro do slide atual, e não com o anterior: assim pega os slides montados aos
    poucos. O intervalo mínimo evita contar como slide novo um piscar ou uma animação rápida.
    """

    def __init__(self, *, threshold: float = 0.12, min_gap: float = 3.0):
        self.threshold = threshold
        self.min_gap = min_gap
        self._reference: list[float] | None = None
        self._last_start = 0.0

    def offer(self, timestamp: float, signature: Sequence[float]) -> bool:
        if self._reference is None:
            self._reference, self._last_start = list(signature), timestamp
            return True
        distance = sum(abs(a - b) for a, b in zip(signature, self._reference)) / max(len(signature), 1)
        if distance >= self.threshold and timestamp - self._last_start >= self.min_gap:
            self._reference, self._last_start = list(signature), timestamp
            return True
        return False


def detect_slide_starts(
    samples: Iterable[tuple[float, Sequence[float]]], *, threshold: float = 0.12, min_gap: float = 3.0
) -> list[float]:
    detector = SlideDetector(threshold=threshold, min_gap=min_gap)
    return [timestamp for timestamp, signature in samples if detector.offer(timestamp, signature)]


def _speech(segments: Iterable[Segment]) -> list[DocElement]:
    return [DocElement(kind="speech", text=text, start_seconds=start, end_seconds=end) for start, end, text in segments]


def lesson_sections(
    segments: Sequence[Segment],
    *,
    slides: Sequence[tuple[float, str]],
    window_seconds: float = DEFAULT_WINDOW_SECONDS,
) -> list[Section]:
    """Com slides, uma seção por slide (imagem + fala); sem slides, janelas de tempo."""
    sections: list[Section] = []
    if slides:
        starts = [start for start, _ in slides]
        groups: list[list[Segment]] = [[] for _ in slides]
        for segment in segments:
            owner = 0
            for position, start in enumerate(starts):
                if start <= segment[0]:
                    owner = position
            groups[owner].append(segment)
        for number, ((start, asset_key), group) in enumerate(zip(slides, groups), start=1):
            caption = f"Slide {number} ({format_timestamp(start)})"
            elements = [DocElement(kind="picture", text=caption, asset_key=asset_key, start_seconds=start), *_speech(group)]
            sections.append(
                Section(
                    position=len(sections),
                    title=f"Slide {number} · {format_timestamp(start)}",
                    level=1,
                    heading_path=(),
                    elements=tuple(elements),
                    start_seconds=start,
                    end_seconds=max((end for _, end, _ in group), default=start),
                )
            )
        return sections

    windows: dict[int, list[Segment]] = {}
    for segment in segments:
        windows.setdefault(int(segment[0] // window_seconds), []).append(segment)
    for _, group in sorted(windows.items()):
        start, end = group[0][0], group[-1][1]
        sections.append(
            Section(
                position=len(sections),
                title=f"{format_timestamp(start)}–{format_timestamp(end)}",
                level=1,
                heading_path=(),
                elements=tuple(_speech(group)),
                start_seconds=start,
                end_seconds=end,
            )
        )
    return sections
