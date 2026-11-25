"""The expanded corpus keeps Wiley law and leaves templates out."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from expand_corpus import (
    EXCLUDED_MARKERS,
    INCLUDED,
    authority_header,
    index_parts,
    instrument_parts,
    write_instrument,
)
from split_sections import write_corpus


ORDINANCE = """ORDINANCE 2018-2
WHEREAS, the Town of Wiley protects its water system.
Section 1. Purpose.
The Town shall protect the public water system from backflow.
Section 2. Penalty.
A violation is a municipal offense.
"""

INDEX = """Animals running at large\t7-6-120
-B-
BOARD OF TRUSTEES
Meetings\t2-2-60
"""


class ExpandCorpusTest(unittest.TestCase):
    def test_included_authorities_are_unique_and_skip_templates(self) -> None:
        authorities = [item.authority for item in INCLUDED]
        self.assertEqual(len(authorities), len(set(authorities)))
        joined = "\n".join(item.relative for item in INCLUDED)
        for marker in EXCLUDED_MARKERS:
            self.assertNotIn(marker, joined)
        self.assertIn("ordinance-2024-1", authorities)
        self.assertIn("ordinance-2019-3", authorities)
        self.assertIn("resolution-2026-3", authorities)
        self.assertIn("resolution-2026-1-election", authorities)
        self.assertIn("resolution-2026-1-sewer-rates", authorities)

    def test_sections_keep_the_preamble_and_the_authority_header(self) -> None:
        parts = instrument_parts(ORDINANCE)
        self.assertEqual([number for number, _ in parts], ["1", "2"])
        self.assertIn("WHEREAS", parts[0][1])
        self.assertNotIn("Section 2", parts[0][1])
        spec = next(item for item in INCLUDED if item.authority == "ordinance-2018-2")
        header = authority_header(spec)
        self.assertIn("Adopted in 2018", header)
        self.assertIn("later authority", header)
        self.assertNotIn("invent", header)

    def test_code_section_numbers_stay_inside_the_resolution(self) -> None:
        text = (
            "SECTION 5. Conflicting resolutions are repealed.\n"
            "SECTION 13-1-120. The monthly water rate is fifty dollars.\n"
            "SECTION 6. This resolution is effective after publication.\n"
        )
        parts = instrument_parts(text)
        self.assertEqual([number for number, _ in parts], ["5", "6"])
        self.assertIn("13-1-120", parts[0][1])

    def test_index_uses_the_preamble_as_letter_a(self) -> None:
        self.assertEqual([letter for letter, _ in index_parts(INDEX)], ["A", "B"])

    def test_write_does_not_remove_municipal_code_sections(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            write_corpus(
                {
                    7: [
                        (
                            "sec-7-6-120.md",
                            {"section": "7-6-120", "authority": "code"},
                            "No owner shall permit a dog to run at large.",
                        )
                    ]
                },
                output,
            )
            spec = next(item for item in INCLUDED if item.authority == "ordinance-2018-2")
            write_instrument(output, spec, ORDINANCE)
            self.assertTrue((output / "07" / "sec-7-6-120.md").is_file())
            self.assertTrue((output / "ordinances" / "ordinance-2018-2-section-1.md").is_file())
            sidecar = output / "ordinances" / "ordinance-2018-2-section-1.md.metadata.json"
            self.assertIn("ordinance-2018-2", sidecar.read_text(encoding="utf-8"))
            write_corpus(
                {
                    7: [
                        (
                            "sec-7-6-10.md",
                            {"section": "7-6-10", "authority": "code"},
                            "Animals running at large are prohibited.",
                        )
                    ]
                },
                output,
            )
            self.assertTrue(sidecar.is_file())
            self.assertFalse((output / "07" / "sec-7-6-120.md").exists())


if __name__ == "__main__":
    unittest.main()
