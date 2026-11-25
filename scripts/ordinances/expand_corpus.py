#!/usr/bin/env python3
"""Add later Wiley ordinances, resolutions, the disposition table, and the index.

The municipal-code sections and Ordinance 2024-2 stay where split_sections.py
put them. This script does not embed vectors. Bedrock Titan embeds the markdown
on the next ingestion job. Model ordinances and the scanned code PDF stay out.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from ocr_ordinances import (
    HEADING,
    convert_file,
    drop_binary_tail,
    engine_binary,
    strip_controls,
)
from split_sections import write_section
from text_quality import printable_ratio, text_is_usable

DESKTOP_DEFAULT = Path.home() / "Desktop" / "Town of Wiley Ordinances"
OUTPUT_DEFAULT = DESKTOP_DEFAULT / "ingest" / "source"

# "Section 1." is an instrument section. "SECTION 13-1-120" is a code cite.
SECTION_HEADING = re.compile(
    r"(?m)^(?:Section|SECTION)\s+(\d+[A-Za-z]?)(?!-\d)(?:\b|[.:])"
)
INDEX_LETTER = re.compile(r"(?m)^-([A-Z])-\s*$")
WORD_TEXT = re.compile(r"<w:t[^>]*>([^<]*)</w:t>")


@dataclass(frozen=True)
class SourceDocument:
    relative: str
    authority: str
    instrument: str
    title: str
    adopted: str
    section: str
    kind: str


# Clean Word wins when the signed file is a scan of the same ordinance.
# Ordinance 2024-2 is already one section file per code section.
INCLUDED: tuple[SourceDocument, ...] = (
    SourceDocument(
        "Ordinances (NAS)/ORDINANCE 2017 DLS CLEAN COPY.docx",
        "ordinance-2017-2",
        "ordinance",
        "Ordinance 2017-2",
        "2017",
        "2017-2",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/ORDINANCE 2018-2 cross control.docx",
        "ordinance-2018-2",
        "ordinance",
        "Ordinance 2018-2, backflow and cross-connection control",
        "2018",
        "2018-2",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/ORDINANCE 2018-3 trucks.docx",
        "ordinance-2018-3",
        "ordinance",
        "Ordinance 2018-3, truck parking",
        "2018",
        "2018-3",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from other folders/ORDINANCE NO 2012-11 CERT OF LEINS TO TREASURY.docx",
        "ordinance-2012-11",
        "ordinance",
        "Ordinance 2012-11, certificates of liens to the treasurer",
        "2012",
        "2012-11",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from other folders/ORDINANCE 2019.docx",
        "ordinance-2019-1",
        "ordinance",
        "Ordinance 2019-1, alcohol beverage tastings",
        "2019",
        "2019-1",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/ORDINANCE 2019-2.docx",
        "ordinance-2019-2",
        "ordinance",
        "Ordinance 2019-2, time and place of Board meetings",
        "2019",
        "2019-2",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/2019-3 sales tax.pdf",
        "ordinance-2019-3",
        "ordinance",
        "Ordinance 2019-3, sales tax",
        "2019",
        "2019-3",
        "pdf",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/O R D I N A N C E 2021-8.docx",
        "ordinance-2021-8",
        "ordinance",
        "Ordinance 2021-8, Wiley Gardens annexation",
        "2021",
        "2021-8",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/O R D I N A N C E  2021-9.docx",
        "ordinance-2021-9",
        "ordinance",
        "Ordinance 2021-9, Wiley Gardens zoning",
        "2021",
        "2021-9",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/O R D I N A N C E 2021-11.docx",
        "ordinance-2021-11",
        "ordinance",
        "Ordinance 2021-11, Wiley Sanitation District annexation",
        "2021",
        "2021-11",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/O R D I N A N C E 2021-12.docx",
        "ordinance-2021-12",
        "ordinance",
        "Ordinance 2021-12, Wiley Sanitation District zoning",
        "2021",
        "2021-12",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/2022 MEET TIME-ORDINANCE 2022-2.docx",
        "ordinance-2022-2",
        "ordinance",
        "Ordinance 2022-2, time and place of Board meetings",
        "2022",
        "2022-2",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/2023-3 use tax ordinance.docx",
        "ordinance-2023-2-use-tax",
        "ordinance",
        "Ordinance 2023-2, use tax",
        "2023",
        "2023-2",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/TOWN OF WILEY.docx",
        "ordinance-2023-2-vehicle-use-tax",
        "ordinance",
        "Ordinance 2023-2, motor vehicle use tax",
        "2023",
        "2023-2",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from Backup/2024-1 WILEY ORDINANCE AFFORDABLE HOUSING.docx",
        "ordinance-2024-1",
        "ordinance",
        "Ordinance 2024-1, affordable housing",
        "2024",
        "2024-1",
        "word",
    ),
    SourceDocument(
        "Resolutions (NAS)/2013-1 resolution 2nd amend.pdf",
        "resolution-2013-1",
        "resolution",
        "Resolution 2013-1, right to keep and bear arms",
        "2013",
        "2013-1",
        "pdf",
    ),
    SourceDocument(
        "Ordinances (NAS)/from other folders/ORDSUP CCF (2024 budget folder).doc",
        "resolution-2023-supplemental-budget",
        "resolution",
        "Resolution, 2023 supplemental budget",
        "2023",
        "Resolution 2023 supplemental budget",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/ORDSUP CCF.doc",
        "resolution-2025-supplemental-budget",
        "resolution",
        "Resolution, 2025 supplemental budget",
        "2025",
        "Resolution 2025 supplemental budget",
        "word",
    ),
    SourceDocument(
        "Ordinances (NAS)/from other folders/ORDSUP CCF (2027 budget folder).doc",
        "resolution-2026-supplemental-budget",
        "resolution",
        "Resolution, 2026 supplemental budget",
        "2026",
        "Resolution 2026 supplemental budget",
        "word",
    ),
    SourceDocument(
        "Resolutions (NAS)/RESOLUTION 2025-2 water rate increase.docx",
        "resolution-2025-2",
        "resolution",
        "Resolution 2025-2, water rate increase",
        "2025",
        "2025-2",
        "word",
    ),
    SourceDocument(
        "Resolutions (NAS)/RESOLUTION 2025-3.docx",
        "resolution-2025-3-nietc",
        "resolution",
        "Resolution 2025-3, opposition to unilateral federal land acquisition",
        "2025",
        "2025-3",
        "word",
    ),
    SourceDocument(
        "Resolutions (NAS)/signed Resolution 2025-3.pdf",
        "resolution-2025-3-wsd-signers",
        "resolution",
        "Resolution 2025-3, Wiley Sanitation District sewer-pond signers",
        "2025",
        "2025-3",
        "pdf",
    ),
    SourceDocument(
        "Resolutions (NAS)/2025 RESO ELECTION.doc",
        "resolution-2025-4-election",
        "resolution",
        "Resolution 2025-4, cancellation of a municipal election",
        "2025",
        "2025-4",
        "word",
    ),
    SourceDocument(
        "Resolutions (NAS)/Signed Resolution 2025-4.pdf",
        "resolution-2025-4-wsd-loan",
        "resolution",
        "Resolution 2025-4, Wiley Sanitation District interim loan",
        "2025",
        "2025-4",
        "pdf",
    ),
    SourceDocument(
        "Resolutions (NAS)/RESOLUTION 2026-1 CANCEL ELECTION.pdf",
        "resolution-2026-1-election",
        "resolution",
        "Resolution 2026-1, cancelling the municipal election",
        "2026",
        "2026-1",
        "pdf",
    ),
    SourceDocument(
        "Resolutions (NAS)/RESOLUTION 2026-1.pdf",
        "resolution-2026-1-sewer-rates",
        "resolution",
        "Resolution 2026-1, Wiley Sanitation District sewer rates",
        "2026",
        "2026-1",
        "pdf",
    ),
    SourceDocument(
        "Resolutions (NAS)/2026-2 JW Resolution.docx",
        "resolution-2026-2",
        "resolution",
        "Resolution 2026-2, honoring Jimmie Wayne Wilks",
        "2026",
        "2026-2",
        "word",
    ),
    SourceDocument(
        "Resolutions (NAS)/SIGNED RESOLUTION 2026-3.pdf",
        "resolution-2026-3",
        "resolution",
        "Resolution 2026-3, water and trash rates",
        "2026",
        "2026-3",
        "pdf",
    ),
    SourceDocument(
        "Resolutions (NAS)/signed Resolution 2026-4 apply for EIAF grant.pdf",
        "resolution-2026-4",
        "resolution",
        "Resolution 2026-4, EIAF grant application",
        "2026",
        "2026-4",
        "pdf",
    ),
)

# Not Wiley law, or already represented by a cleaner copy.
EXCLUDED_MARKERS: tuple[str, ...] = (
    "Reference models/",
    "ORDINANCE NO.docx",
    "ORDINANCE 2017 DLS CLEAN COPY.rtf",
    "ORDINANCE 2017-2A",
    "dog.pdf",
    "signed updated dog ordinance 2024.pdf",
    "dog ordinance.docx",
    "working ordinance use tax.docx",
    "2-ORDINANCE 2019-2.docx",
    "A RESOLUTION OF THE TOWN COUNCIL OF THE TOWN OF WILEY.docx",
    "RESOLUTION 2026-1 WSD Rate Increase.docx",
    "RESOLUTION 2026-3 water rate increase.docx",
    "signed Resolution 2026-3 water trash rates.docx",
    "signed wsd resolution 2026-1",
    "wsd 2025-3 signers.docx",
    "Wiley_Municipal_Code_IN_PROGRESS.pdf",
    "ORD 2021-",
    "signed ord 2018-3",
    "2023 use tax ordinance SIGNED.pdf",
)


def authority_header(spec: SourceDocument) -> str:
    if spec.instrument == "ordinance":
        return (
            f"This is {spec.title}. Adopted in {spec.adopted}. "
            "It is later authority than the municipal code section it amends "
            "and later than an earlier ordinance on the same subject."
        )
    return (
        f"This is {spec.title}. Adopted in {spec.adopted}. "
        "It is a resolution. Where it conflicts with an earlier resolution on the "
        "same subject, this later resolution controls. It does not repeal a "
        "municipal code section unless its text says so."
    )


def instrument_parts(text: str) -> list[tuple[str, str]]:
    """Split on Section headings when an instrument has more than one."""
    matches = list(SECTION_HEADING.finditer(text))
    if len(matches) < 2:
        return [("", text.strip())]
    preamble = text[: matches[0].start()].strip()
    parts: list[tuple[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.start() : end].strip()
        if index == 0 and preamble:
            body = f"{preamble}\n\n{body}"
        number = match.group(1)
        previous = next((item for item in parts if item[0] == number), None)
        if previous is None:
            parts.append((number, body))
        elif len(body) > len(previous[1]):
            parts[parts.index(previous)] = (number, body)
    return parts


def index_parts(text: str) -> list[tuple[str, str]]:
    pieces = INDEX_LETTER.split(text)
    rows: list[tuple[str, str]] = []
    preamble = pieces[0].strip()
    if preamble:
        rows.append(("A", preamble))
    for index in range(1, len(pieces), 2):
        letter = pieces[index]
        body = pieces[index + 1].strip() if index + 1 < len(pieces) else ""
        if body:
            rows.append((letter, body))
    return rows


def fields_for(spec: SourceDocument, section: str) -> dict[str, str]:
    return {
        "section": section or spec.section,
        "authority": spec.authority,
        "title": spec.title,
        "instrument": spec.instrument,
        "adopted": spec.adopted,
        "sourceFile": Path(spec.relative).name,
    }


def clear_generated(output: Path) -> None:
    for name in ("ordinances", "resolutions", "19", "20"):
        directory = output / name
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if path.is_file() and path.suffix in {".md", ".json"}:
                path.unlink()


def write_instrument(output: Path, spec: SourceDocument, text: str) -> int:
    folder = output / ("ordinances" if spec.instrument == "ordinance" else "resolutions")
    header = authority_header(spec)
    count = 0
    for number, body in instrument_parts(text):
        if not body.strip():
            continue
        section = number or spec.section
        filename = (
            f"{spec.authority}.md"
            if not number
            else f"{spec.authority}-section-{number}.md"
        )
        write_section(folder, filename, fields_for(spec, section), f"{header}\n\n{body}")
        count += 1
    return count


def write_disposition(output: Path, text: str) -> int:
    fields = {
        "section": "19-disposition",
        "authority": "code-disposition",
        "title": "Chapter 19 disposition table",
        "instrument": "disposition",
        "adopted": "",
        "sourceFile": "19 Wiley Clean.doc",
    }
    body = (
        "This is the Chapter 19 disposition table. It maps prior code numbers "
        "to current municipal code sections. It is not itself a rule.\n\n"
        + text.strip()
    )
    write_section(output / "19", "disposition.md", fields, body)
    return 1


def write_index(output: Path, text: str) -> int:
    count = 0
    for letter, body in index_parts(text):
        fields = {
            "section": f"20-{letter}",
            "authority": "code-index",
            "title": f"Chapter 20 index, letter {letter}",
            "instrument": "index",
            "adopted": "",
            "sourceFile": "20 Wiley Index Clean.doc",
        }
        labeled = (
            f"This is the Chapter 20 index, letter {letter}. "
            "It points to municipal code sections. It is not itself a rule.\n\n"
            + body
        )
        write_section(output / "20", f"index-{letter.lower()}.md", fields, labeled)
        count += 1
    return count


def docx_xml_text(path: Path) -> str:
    if path.suffix.lower() != ".docx":
        return ""
    import zipfile

    try:
        archive = zipfile.ZipFile(path)
    except zipfile.BadZipFile:
        return ""
    chunks: list[str] = []
    with archive:
        for name in archive.namelist():
            if not (name.startswith("word/") and name.endswith(".xml")):
                continue
            xml = archive.read(name).decode("utf-8", errors="replace")
            words = WORD_TEXT.findall(xml)
            if words:
                chunks.append(" ".join(words))
    return "\n".join(chunks).strip()


def read_word_text(path: Path) -> str:
    result = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", str(path)],
        check=False,
        capture_output=True,
    )
    if result.returncode != 0 and not result.stdout:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace")[:500])
    cleaned = strip_controls(result.stdout.decode("utf-8", errors="replace"))
    match = HEADING.search(cleaned)
    if match and match.start() > 80 and printable_ratio(cleaned[: match.start()]) < 0.85:
        cleaned = cleaned[match.start() :]
    text = drop_binary_tail(cleaned)
    extra = docx_xml_text(path)
    if len(extra) > len(text) + 200:
        return extra
    return text


def prose_from_document(text: str) -> str:
    lines = [
        line
        for line in text.splitlines()
        if not line.startswith("---")
        and not line.startswith("source:")
        and not line.startswith("<!--")
    ]
    return "\n".join(lines).strip()


def read_pdf_text(root: Path, relative: str) -> str:
    source = root / relative
    work = root / "converted" / "work" / relative
    document = work / "document.md"
    prose = prose_from_document(document.read_text(encoding="utf-8")) if document.is_file() else ""
    if not text_is_usable(prose):
        convert_file(engine_binary(), root, root / "converted", source)
        prose = prose_from_document(document.read_text(encoding="utf-8"))
    return prose


def read_source(root: Path, spec: SourceDocument) -> str:
    path = root / spec.relative
    if spec.kind == "pdf":
        return read_pdf_text(root, spec.relative)
    return read_word_text(path)


def build_expanded(root: Path, output: Path) -> dict[str, int]:
    clear_generated(output)
    counts = {"ordinances": 0, "resolutions": 0, "disposition": 0, "index": 0, "skipped": 0}
    for spec in INCLUDED:
        text = read_source(root, spec)
        if not text_is_usable(text):
            print(f"skipped unusable text: {spec.relative}", file=sys.stderr)
            counts["skipped"] += 1
            continue
        written = write_instrument(output, spec, text)
        key = "ordinances" if spec.instrument == "ordinance" else "resolutions"
        counts[key] += written
    disposition = root / "converted" / "work" / "19 Wiley Clean.doc" / "body.txt"
    index = root / "converted" / "work" / "20 Wiley Index Clean.doc" / "body.txt"
    if disposition.is_file():
        counts["disposition"] = write_disposition(output, disposition.read_text(encoding="utf-8"))
    if index.is_file():
        counts["index"] = write_index(output, index.read_text(encoding="utf-8"))
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DESKTOP_DEFAULT)
    parser.add_argument("--output", type=Path, default=OUTPUT_DEFAULT)
    args = parser.parse_args()
    root = args.source.expanduser()
    output = args.output.expanduser()
    if not root.is_dir():
        print(f"Source folder not found: {root}", file=sys.stderr)
        return 1
    counts = build_expanded(root, output)
    print(json.dumps({"output": str(output), **counts}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
