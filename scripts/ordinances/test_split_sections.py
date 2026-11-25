"""Unit checks for splitting the municipal code into one file per section."""

from __future__ import annotations

import unittest

from split_sections import (
    BODY_HEADING,
    CODE_CHAPTERS,
    ORDINANCE_HEADING,
    SKIP_NAMES,
    mark_superseded,
    split_dog_ordinance,
    split_numbered_sections,
)


CODE = """CHAPTER 7
Sec. 7-6-110	Definitions
Sec. 7-6-120	Running at large prohibited

ARTICLE VI
Sec. 7-6-110.	Definitions.
Fierce dog means a dog that bites.
Sec. 7-6-120.	Running at large prohibited.
No owner shall permit any dog to run at large.
"""

DOG = """ORDINANCE # 2024-2
Section 7-6-110 Definitions.
Control means a leash not over six feet.
Section 7-6-120 Running at Large prohibited.
It is unlawful to fail to prevent an animal from running at large.
"""


class SplitSectionsTest(unittest.TestCase):
    def test_skips_the_table_of_contents_and_keeps_the_body(self) -> None:
        sections = split_numbered_sections(CODE, BODY_HEADING)
        self.assertEqual(set(sections), {"7-6-110", "7-6-120"})
        self.assertIn("Fierce dog", sections["7-6-110"])
        self.assertNotIn("Sec. 7-6-110\t", sections["7-6-110"])

    def test_dog_ordinance_marks_the_sections_it_replaces(self) -> None:
        rows = split_dog_ordinance(DOG)
        by_section = {fields["section"]: fields for _, fields, _ in rows}
        self.assertEqual(by_section["7-6-120"]["authority"], "ordinance-2024-2")
        self.assertEqual(by_section["7-6-120"]["supersedes"], "7-6-120")
        self.assertTrue(any(name.startswith("ordinance-2024-2-sec-") for name, _, _ in rows))
        self.assertIn("unlawful", dict((fields["section"], body) for _, fields, body in rows)["7-6-120"])

    def test_code_copy_records_the_later_ordinance(self) -> None:
        code_rows = [
            (
                "sec-7-6-120.md",
                {"section": "7-6-120", "authority": "code"},
                "No owner shall permit any dog to run at large.",
            )
        ]
        marked = mark_superseded(code_rows, {"7-6-120"})
        self.assertEqual(marked[0][1]["supersededBy"], "ordinance-2024-2")

    def test_loose_ordinance_pattern_does_not_eat_the_next_heading(self) -> None:
        sections = split_numbered_sections(DOG, ORDINANCE_HEADING)
        self.assertNotIn("7-6-120", sections["7-6-110"])

    def test_reserved_books_are_not_code_chapters(self) -> None:
        self.assertNotIn("19 Wiley Clean.doc", CODE_CHAPTERS)
        self.assertNotIn("20 Wiley Index Clean.doc", CODE_CHAPTERS)
        self.assertIn("Wiley_Municipal_Code_IN_PROGRESS.pdf", SKIP_NAMES)


if __name__ == "__main__":
    unittest.main()
