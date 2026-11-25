#!/usr/bin/env python3
"""Split converted Wiley ordinance text into one markdown file per section.

The knowledge base should cite 7-6-120, not a whole chapter. Word files start
with a table of contents (``Sec. 7-1-10\\tTitle``) and then the body
(``Sec. 7-1-10. Title.``). Only the body heading is a section. Chapter 19,
the index, later ordinances, and resolutions are added by expand_corpus.py.
The scanned code PDF is not ingested. Bedrock chunks the files later.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

# Body headings have a period after the section number. Contents lines do not.
BODY_HEADING = re.compile(r"(?m)^Sec\.\s+(\d{1,2}-\d{1,2}-\d{1,3})\.\s*")
ORDINANCE_HEADING = re.compile(
    r"(?mi)^[ \t]*Section\s+(\d{1,2}-\d{1,2}-\d{1,3})\b[:.]?\s*"
)

# Clean Word chapters that are law. 00 is front matter, 19 is a comparison
# table, and 20 is the index.
CODE_CHAPTERS: dict[str, int] = {
    "01 Wiley Clean.doc": 1,
    "02 Wiley Clean.doc": 2,
    "04 Wiley Clean.doc": 4,
    "05 Wiley Clean.doc": 5,
    "07 Wiley Clean.doc": 7,
    "08 Wiley Clean.doc": 8,
    "10 Wiley Clean.doc": 10,
    "11 Wiley Clean.doc": 11,
    "13 Wiley Clean.doc": 13,
    "15 Wiley Clean.doc": 15,
    "16 Wiley Clean.doc": 16,
    "17 Wiley Clean.doc": 17,
    "18 Wiley Clean.doc": 18,
}
DOG_ORDINANCE = "dog ordinance.docx"
DOG_AUTHORITY = "ordinance-2024-2"
SKIP_NAMES = {
    "00 Begin Wiley Clean.doc",
    "19 Wiley Clean.doc",
    "20 Wiley Index Clean.doc",
    "Wiley_Municipal_Code_IN_PROGRESS.pdf",
}

CONVERTED_DEFAULT = (
    Path.home() / "Desktop" / "Town of Wiley Ordinances" / "converted" / "work"
)
OUTPUT_DEFAULT = Path.home() / "Desktop" / "Town of Wiley Ordinances" / "ingest" / "source"


def split_numbered_sections(text: str, pattern: re.Pattern[str]) -> dict[str, str]:
    """Return section number to body text. A repeated number keeps the longer body."""
    matches = list(pattern.finditer(text))
    chosen: dict[str, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        number = match.group(1)
        body = text[match.start() : end].strip()
        if number not in chosen or len(body) > len(chosen[number]):
            chosen[number] = body
    return chosen


def front_matter(fields: dict[str, str]) -> str:
    lines = ["---"]
    for key, value in fields.items():
        if value:
            lines.append(f"{key}: {json.dumps(value)}")
    lines.append("---")
    return "\n".join(lines)


def section_document(fields: dict[str, str], body: str) -> str:
    return f"{front_matter(fields)}\n\n{body.strip()}\n"


def metadata_document(fields: dict[str, str]) -> str:
    attributes = {key: value for key, value in fields.items() if value}
    return json.dumps({"metadataAttributes": attributes}, indent=2) + "\n"


def write_section(directory: Path, filename: str, fields: dict[str, str], body: str) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / filename
    path.write_text(section_document(fields, body), encoding="utf-8")
    path.with_name(f"{filename}.metadata.json").write_text(
        metadata_document(fields),
        encoding="utf-8",
    )
    return path


def chapter_dir(output: Path, chapter: int) -> Path:
    return output / f"{chapter:02d}"


def split_code_chapter(text: str, source_file: str, chapter: int) -> list[tuple[str, dict[str, str], str]]:
    sections = split_numbered_sections(text, BODY_HEADING)
    rows: list[tuple[str, dict[str, str], str]] = []
    for number in sorted(sections):
        fields = {
            "chapter": str(chapter),
            "section": number,
            "sourceFile": source_file,
            "authority": "code",
        }
        rows.append((f"sec-{number}.md", fields, sections[number]))
    return rows


def split_dog_ordinance(text: str) -> list[tuple[str, dict[str, str], str]]:
    sections = split_numbered_sections(text, ORDINANCE_HEADING)
    rows: list[tuple[str, dict[str, str], str]] = []
    for number in sorted(sections):
        fields = {
            "chapter": number.split("-", 1)[0],
            "section": number,
            "sourceFile": DOG_ORDINANCE,
            "authority": DOG_AUTHORITY,
            "supersedes": number,
        }
        rows.append((f"ordinance-2024-2-sec-{number}.md", fields, sections[number]))
    return rows


def appendix_rows(directory: Path, source_file: str) -> list[tuple[str, dict[str, str], str]]:
    rows: list[tuple[str, dict[str, str], str]] = []
    for path in sorted(directory.glob("embedded-*.txt")):
        body = path.read_text(encoding="utf-8").strip()
        if len(body) < 80:
            continue
        index = int(path.stem.rsplit("-", 1)[-1]) + 1
        number = f"18-appendix-{index}"
        fields = {
            "chapter": "18",
            "section": number,
            "sourceFile": source_file,
            "authority": "code",
            "appendix": path.stem,
        }
        rows.append((f"{number}.md", fields, body))
    return rows


def mark_superseded(
    rows: list[tuple[str, dict[str, str], str]],
    superseded: set[str],
) -> list[tuple[str, dict[str, str], str]]:
    marked: list[tuple[str, dict[str, str], str]] = []
    for filename, fields, body in rows:
        if fields.get("authority") == "code" and fields.get("section") in superseded:
            fields = {**fields, "supersededBy": DOG_AUTHORITY}
        marked.append((filename, fields, body))
    return marked


def build_corpus(converted: Path) -> dict[int, list[tuple[str, dict[str, str], str]]]:
    corpus: dict[int, list[tuple[str, dict[str, str], str]]] = {}
    for filename, chapter in CODE_CHAPTERS.items():
        body_path = converted / filename / "body.txt"
        if not body_path.is_file():
            raise FileNotFoundError(body_path)
        rows = split_code_chapter(body_path.read_text(encoding="utf-8"), filename, chapter)
        if chapter == 18:
            rows.extend(appendix_rows(converted / filename, filename))
        corpus[chapter] = rows
    dog_path = converted / DOG_ORDINANCE / "body.txt"
    if not dog_path.is_file():
        raise FileNotFoundError(dog_path)
    dog_rows = split_dog_ordinance(dog_path.read_text(encoding="utf-8"))
    superseded = {fields["section"] for _, fields, _ in dog_rows}
    for chapter, rows in corpus.items():
        corpus[chapter] = mark_superseded(rows, superseded)
    corpus.setdefault(7, [])
    corpus[7] = [row for row in corpus[7] if row[1].get("authority") != DOG_AUTHORITY]
    corpus[7].extend(dog_rows)
    return corpus


def write_corpus(corpus: dict[int, list[tuple[str, dict[str, str], str]]], output: Path) -> int:
    """Rewrite only the chapter folders this function owns.

    Later ordinances, resolutions, the disposition table, and the index live
    beside those folders. A full wipe would drop them on the next code split.
    """
    count = 0
    for chapter, rows in corpus.items():
        directory = chapter_dir(output, chapter)
        if directory.exists():
            for path in directory.rglob("*"):
                if path.is_file() and path.suffix in {".md", ".json"}:
                    path.unlink()
        for filename, fields, body in rows:
            write_section(directory, filename, fields, body)
            count += 1
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--converted", type=Path, default=CONVERTED_DEFAULT)
    parser.add_argument("--output", type=Path, default=OUTPUT_DEFAULT)
    args = parser.parse_args()
    corpus = build_corpus(args.converted.expanduser())
    count = write_corpus(corpus, args.output.expanduser())
    print(json.dumps({"sections": count, "output": str(args.output.expanduser())}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
