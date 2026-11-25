"""Decide when ordinance text is already good enough to keep."""

from __future__ import annotations

import re

LEGAL_CUES = (
    "shall",
    "town",
    "section",
    "ordinance",
    "code",
    "wiley",
    "board",
    "sec.",
    "resolution",
)

FUNCTION_WORDS = frozenset(
    {
        "the",
        "of",
        "and",
        "to",
        "a",
        "in",
        "for",
        "or",
        "by",
        "be",
        "is",
        "as",
        "on",
        "that",
        "this",
    }
)

_WORD = re.compile(r"[a-z]{2,}")


def printable_ratio(text: str) -> float:
    if not text:
        return 0.0
    good = 0
    for char in text:
        code = ord(char)
        if char in "\n\t\r" or 32 <= code < 127:
            good += 1
    return good / len(text)


def function_word_count(text: str) -> int:
    words = _WORD.findall(text.lower())
    return sum(1 for word in words if word in FUNCTION_WORDS)


def cue_count(text: str) -> int:
    lowered = text.lower()
    return sum(1 for cue in LEGAL_CUES if cue in lowered)


def text_is_usable(text: str) -> bool:
    """True when the text reads as municipal English rather than a broken text layer.

    Upside-down scans often still contain letters, so letter-count alone is not enough.
    Usable text has ordinary function words and at least one code cue.
    """
    if printable_ratio(text) < 0.9:
        return False
    if len(text.split()) < 40:
        return False
    if function_word_count(text) < 8:
        return False
    return cue_count(text) >= 2


def quality_rank(text: str) -> tuple[int, int, int]:
    """Higher is a better reading. Used to choose upright versus rotated OCR."""
    usable = 1 if text_is_usable(text) else 0
    return (usable, function_word_count(text), cue_count(text))
