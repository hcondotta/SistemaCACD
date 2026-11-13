"""Aulas: legendas, troca de slides e trechos da transcrição com minutagem."""

from cacd_factory.lessons import SlideDetector, detect_slide_starts, lesson_sections, parse_subtitles


def test_slide_detector_answers_sample_by_sample_for_streaming_video():
    detector = SlideDetector(threshold=0.25, min_gap=1.0)

    answers = [detector.offer(t, signature) for t, signature in [(0.0, [0.0]), (2.0, [0.1]), (4.0, [0.9])]]

    assert answers == [True, False, True]


def test_srt_is_parsed_into_timed_segments():
    srt = (
        "1\n00:00:01,000 --> 00:00:04,500\nOlá, turma.\n\n"
        "2\n00:00:05,000 --> 00:00:09,000\nHoje: IS-LM\ne câmbio.\n"
    )

    assert parse_subtitles(srt) == [(1.0, 4.5, "Olá, turma."), (5.0, 9.0, "Hoje: IS-LM e câmbio.")]


def test_vtt_with_header_cue_settings_and_voice_tags_is_parsed():
    vtt = (
        "WEBVTT\n\nNOTE gerado pelo YouTube\n\n"
        "00:01.000 --> 00:04.000 align:start position:0%\n<v Prof>Bom dia</v>\n\n"
        "01:02:03.500 --> 01:02:05.000\nFim\n"
    )

    assert parse_subtitles(vtt) == [(1.0, 4.0, "Bom dia"), (3723.5, 3725.0, "Fim")]


def test_repeated_rolling_captions_are_collapsed():
    # A legenda automática do YouTube repete, no cue seguinte, a linha anterior.
    vtt = "WEBVTT\n\n00:00.000 --> 00:02.000\nA taxa de juros\n\n00:02.000 --> 00:04.000\nA taxa de juros\nsobe\n"

    assert parse_subtitles(vtt) == [(0.0, 2.0, "A taxa de juros"), (2.0, 4.0, "sobe")]


def test_a_new_slide_starts_when_the_picture_changes_enough():
    black, white = [0.0] * 8, [1.0] * 8
    samples = [(0.0, black), (2.0, black), (4.0, white), (6.0, white), (8.0, black)]

    assert detect_slide_starts(samples, threshold=0.25, min_gap=1.0) == [0.0, 4.0, 8.0]


def test_gradual_builds_count_against_the_first_frame_of_the_slide():
    samples = [(float(t), [t * 0.05] * 8) for t in range(0, 12, 2)]  # 0.0, 0.1, ..., 0.5

    assert detect_slide_starts(samples, threshold=0.25, min_gap=1.0) == [0.0, 6.0]


def test_changes_inside_the_minimum_gap_wait_for_the_next_sample_after_it():
    black, white = [0.0] * 8, [1.0] * 8
    samples = [(0.0, black), (1.0, white), (2.0, white), (9.0, white)]

    assert detect_slide_starts(samples, threshold=0.25, min_gap=5.0) == [0.0, 9.0]


def test_transcript_is_grouped_by_slide_with_the_slide_image_first():
    segments = [(0.0, 5.0, "a"), (5.0, 10.0, "b"), (12.0, 15.0, "c"), (20.0, 25.0, "d")]

    sections = lesson_sections(segments, slides=[(0.0, "slide-0001"), (11.0, "slide-0002")], window_seconds=300)

    assert [(s.title, s.start_seconds, s.end_seconds) for s in sections] == [
        ("Slide 1 · 00:00", 0.0, 10.0),
        ("Slide 2 · 00:11", 11.0, 25.0),
    ]
    assert sections[1].content_md == "![Slide 2 (00:11)](asset:slide-0002)\n\nc d"


def test_audio_without_slides_is_grouped_in_time_windows():
    segments = [(0.0, 100.0, "um"), (100.0, 290.0, "dois"), (310.0, 400.0, "três")]

    sections = lesson_sections(segments, slides=[], window_seconds=300)

    assert [(s.title, s.content_md) for s in sections] == [("00:00–04:50", "um dois"), ("05:10–06:40", "três")]
