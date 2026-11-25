"""Unit checks for the ordinance text-quality gate."""

from __future__ import annotations

import unittest

from text_quality import text_is_usable


CLEAN = (
    "PREFACE The Town of Wiley, a statutory Town, has published its Municipal Code. "
    "The three-place section numbering system places the chapter number first. "
    "Each section may be cited by the chapter, article and section number. "
    "The Board of Trustees shall adopt amendments to this Code by ordinance."
)

GARBLED = (
    "Joy Si J] UlaJay pepnjoul useq you pey 10) "
    "JEW BUOTINIsuOoUN Yons JI UdAe paydope useq "
    "aARY PNOM apoOD SIy Jey JUdIUI oANLISIZa oy) "
    "Bulag HW JOoJJo puke aoJOJ NJ Ul anuNUOD yeYs"
)


class TextQualityTest(unittest.TestCase):
    def test_keeps_municipal_prose(self) -> None:
        self.assertTrue(text_is_usable(CLEAN))

    def test_rejects_upside_down_text_layer(self) -> None:
        self.assertFalse(text_is_usable(GARBLED))

    def test_rejects_blank_and_short_text(self) -> None:
        self.assertFalse(text_is_usable(""))
        self.assertFalse(text_is_usable("Sec. 1-1-10 Adoption of Code"))


if __name__ == "__main__":
    unittest.main()
