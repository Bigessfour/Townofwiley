#!/usr/bin/env python3
"""Convert the Town of Wiley ordinance folder to text, favoring accuracy.

Digital Word text and a clean PDF text layer are kept. Those characters are
the document, and running them through OCR would risk section numbers.
Scans, upside-down pages, and embedded page images go through Apple Vision
in accurate mode, rendered at the scan's own pixel size. Two-column code pages
are read down the left column, then the right. A page is turned 180 degrees only
when that makes section numbers run forward, or when the upright reading is not
usable English and the turned reading is. Word files that store a signed page as
an enhanced metafile are unpacked to a bitmap and read the same way.

Usage:
    python3 scripts/ordinances/ocr_ordinances.py
    python3 scripts/ordinances/ocr_ordinances.py --source ~/Desktop/"Town of Wiley Ordinances"
    python3 scripts/ordinances/ocr_ordinances.py --only "18 Wiley Clean.doc"
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

from text_quality import printable_ratio, text_is_usable

SOURCE_DEFAULT = Path.home() / "Desktop" / "Town of Wiley Ordinances"
SKIP_DIR_NAMES = {"from Backup", "Reference models", "converted"}
SUPPORTED = {".pdf", ".doc", ".docx", ".rtf"}
IMAGE_DIM = re.compile(
    rb"/Width\s+(\d+)\s*/Height\s+(\d+)|/Height\s+(\d+)\s*/Width\s+(\d+)"
)
HEADING = re.compile(r"(CHAPTER\s+\d+|ORDINANCE\b|RESOLUTION\b)", re.IGNORECASE)
JPEG_START = b"\xff\xd8\xff"
JPEG_END = b"\xff\xd9"


def engine_binary() -> Path:
    cache = Path.home() / "Library" / "Caches" / "tow-ordinance-ocr"
    cache.mkdir(parents=True, exist_ok=True)
    binary = cache / "OrdinanceVisionOcr"
    source = Path(__file__).with_name("OrdinanceVisionOcr.swift")
    if binary.exists() and binary.stat().st_mtime >= source.stat().st_mtime:
        return binary
    print("Compiling the Vision OCR engine (optimized, once)...", file=sys.stderr)
    subprocess.check_call(
        ["swiftc", "-O", "-whole-module-optimization", str(source), "-o", str(binary)],
    )
    return binary


def run_engine(binary: Path, args: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        [str(binary), *args],
        check=False,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "Vision OCR failed").strip()
        raise RuntimeError(detail)
    return result


def pdf_image_sizes(path: Path) -> list[tuple[int, int]]:
    dims: list[tuple[int, int]] = []
    for width_a, height_a, height_b, width_b in IMAGE_DIM.findall(path.read_bytes()):
        width = int(width_a or width_b)
        height = int(height_a or height_b)
        if width > 200 and height > 200:
            dims.append((width, height))
    return dims


def survey_pdf(binary: Path, pdf: Path, directory: Path) -> list[str]:
    survey_path = directory / "text-layer.json"
    if not survey_path.exists():
        run_engine(binary, ["survey", str(pdf), str(survey_path)])
    pages = json.loads(survey_path.read_text(encoding="utf-8"))
    return [page.get("text") or "" for page in pages]


def ocr_pdf_page(
    binary: Path,
    pdf: Path,
    page_index: int,
    pixel_size: tuple[int, int] | None,
) -> dict:
    width, height = pixel_size or (0, 0)
    result = run_engine(
        binary,
        ["ocr-pdf", str(pdf), str(page_index), str(width), str(height)],
    )
    return json.loads(result.stdout)


def ocr_image(binary: Path, image: Path) -> dict:
    result = run_engine(binary, ["ocr-image", str(image)])
    return json.loads(result.stdout)


def strip_controls(text: str) -> str:
    kept = []
    for char in text.replace("\x00", " "):
        if char == "\f":
            kept.append("\n\f\n")
        elif char in "\n\t\r" or ord(char) >= 32:
            kept.append(char)
        else:
            kept.append(" ")
    return re.sub(r"[ ]{2,}", " ", "".join(kept))


def drop_binary_tail(text: str) -> str:
    """Keep the ordinance prose and stop where Word's binary tail begins."""
    kept: list[str] = []
    for part in text.split("\f"):
        if kept and printable_ratio(part) < 0.85:
            break
        kept.append(part)
    lines = "\n".join(kept).splitlines()
    stamp = re.compile(r"^(Sample\s+\d+\b|.*\bPAGE\s+\d+\b)", re.IGNORECASE)
    while lines:
        line = lines[-1].strip()
        if not line or printable_ratio(line) < 0.9 or stamp.match(line):
            lines.pop()
            continue
        break
    return "\n".join(lines).strip()


def salvage_word_text(text: str) -> str:
    cleaned = strip_controls(text)
    matches = list(HEADING.finditer(cleaned))
    if not matches:
        return cleaned.strip()
    best_at = matches[0].start()
    best_score = -1
    for match in matches:
        window = cleaned[match.start() : match.start() + 500].lower()
        score = (
            window.count("sec") + window.count("article") + window.count("ordinance")
        )
        if score > best_score:
            best_score = score
            best_at = match.start()
    return drop_binary_tail(cleaned[best_at:])


def word_text(path: Path) -> str:
    result = subprocess.run(
        ["textutil", "-convert", "txt", "-stdout", str(path)],
        check=False,
        capture_output=True,
    )
    if result.returncode != 0 and not result.stdout:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace")[:500])
    return salvage_word_text(result.stdout.decode("utf-8", errors="replace"))


def image_is_readable(path: Path) -> bool:
    result = subprocess.run(
        ["sips", "-g", "pixelWidth", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    return (
        result.returncode == 0
        and "pixelWidth:" in result.stdout
        and "<nil>" not in result.stdout
    )


def emf_bitmaps(data: bytes) -> list[bytes]:
    """Pull uncompressed page bitmaps out of a Windows enhanced metafile."""
    bitmaps: list[bytes] = []
    pos = 0
    while pos + 8 <= len(data):
        record_type, size = struct.unpack_from("<II", data, pos)
        if size < 8 or pos + size > len(data):
            break
        if record_type == 81 and size >= 80:
            off_bmi, cb_bmi, off_bits, cb_bits = struct.unpack_from(
                "<IIII", data, pos + 48
            )
            end_bmi = off_bmi + cb_bmi
            end_bits = off_bits + cb_bits
            if cb_bmi >= 40 and cb_bits > 0 and end_bits <= size and end_bmi <= size:
                dib = (
                    data[pos + off_bmi : pos + end_bmi]
                    + data[pos + off_bits : pos + end_bits]
                )
                payload = (
                    struct.pack("<2sIHHI", b"BM", 14 + len(dib), 0, 0, 14 + cb_bmi)
                    + dib
                )
                bitmaps.append(payload)
        if record_type == 14:
            break
        pos += size
    return bitmaps


def docx_media(path: Path, destination: Path) -> list[Path] | None:
    if not zipfile.is_zipfile(path):
        return None
    destination.mkdir(parents=True, exist_ok=True)
    images: list[Path] = []
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if not name.startswith("word/media/"):
                continue
            suffix = Path(name).suffix.lower()
            payload = archive.read(name)
            if suffix == ".emf":
                for bitmap in emf_bitmaps(payload):
                    image = destination / f"embedded-{len(images):03d}.bmp"
                    image.write_bytes(bitmap)
                    if image_is_readable(image):
                        images.append(image)
                    else:
                        image.unlink(missing_ok=True)
                continue
            if suffix not in {".jpg", ".jpeg", ".png", ".tif", ".tiff"}:
                continue
            image = destination / f"embedded-{len(images):03d}{suffix}"
            image.write_bytes(payload)
            if image_is_readable(image) and image.stat().st_size >= 80_000:
                images.append(image)
            else:
                image.unlink(missing_ok=True)
    return images


def carved_jpegs(path: Path, destination: Path) -> list[Path]:
    packaged = docx_media(path, destination)
    if packaged is not None:
        return packaged
    data = path.read_bytes()
    destination.mkdir(parents=True, exist_ok=True)
    found: list[Path] = []
    seen: set[str] = set()
    cursor = 0
    index = 0
    while True:
        start = data.find(JPEG_START, cursor)
        if start < 0:
            break
        end = data.find(JPEG_END, start + 3)
        if end < 0:
            break
        blob = data[start : end + 2]
        cursor = end + 2
        if len(blob) < 80_000:
            continue
        digest = hashlib.sha256(blob).hexdigest()
        if digest in seen:
            continue
        seen.add(digest)
        image = destination / f"embedded-{index:03d}.jpg"
        image.write_bytes(blob)
        if not image_is_readable(image):
            image.unlink(missing_ok=True)
            continue
        found.append(image)
        index += 1
    return found


def iter_sources(root: Path, *, include_backup: bool = False) -> list[Path]:
    skipped = set(SKIP_DIR_NAMES)
    if include_backup:
        skipped.discard("from Backup")
    files: list[Path] = []
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.suffix.lower() not in SUPPORTED:
            continue
        if any(part in skipped for part in path.relative_to(root).parts):
            continue
        if path.name.endswith(".partial"):
            continue
        files.append(path)
    return files


def work_dir(output: Path, root: Path, source: Path) -> Path:
    relative = source.relative_to(root)
    return output / "work" / relative


def write_page(directory: Path, name: str, payload: dict) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"{name}.txt").write_text(
        payload["text"].rstrip() + "\n", encoding="utf-8"
    )
    meta = {key: value for key, value in payload.items() if key != "text"}
    (directory / f"{name}.json").write_text(
        json.dumps(meta, indent=2) + "\n", encoding="utf-8"
    )


def assemble(directory: Path, source: Path) -> Path:
    parts = ["---", f"source: {source}", "---", ""]
    pages = sorted(directory.glob("*.txt"))
    for page in pages:
        meta_path = page.with_suffix(".json")
        meta = (
            json.loads(meta_path.read_text(encoding="utf-8"))
            if meta_path.exists()
            else {}
        )
        label = page.stem
        method = meta.get("method", "unknown")
        rotation = meta.get("rotation")
        confidence = meta.get("meanConfidence")
        note = f"<!-- {label} method={method}"
        if rotation:
            note += f" rotation={rotation}"
        if confidence is not None:
            note += f" confidence={confidence:.3f}"
        note += " -->"
        text = page.read_text(encoding="utf-8").rstrip()
        if not text:
            continue
        parts.extend([note, text, ""])
    document = directory / "document.md"
    document.write_text("\n".join(parts).rstrip() + "\n", encoding="utf-8")
    return document


def page_done(directory: Path, name: str) -> bool:
    return (directory / f"{name}.txt").exists() and (
        directory / f"{name}.json"
    ).exists()


def convert_pdf(binary: Path, source: Path, directory: Path) -> dict:
    sizes = pdf_image_sizes(source)
    page_text = survey_pdf(binary, source, directory)
    page_count = len(page_text)
    matched = len(sizes) == page_count
    ocr_pages = 0
    native_pages = 0
    low_quality = 0
    for index in range(page_count):
        name = f"page-{index + 1:03d}"
        if page_done(directory, name):
            meta = json.loads((directory / f"{name}.json").read_text(encoding="utf-8"))
            if meta.get("method") == "native-text":
                native_pages += 1
            else:
                ocr_pages += 1
            if meta.get("lowQuality"):
                low_quality += 1
            continue
        native = page_text[index]
        if text_is_usable(native):
            write_page(
                directory,
                name,
                {
                    "text": native,
                    "method": "native-text",
                    "page": index + 1,
                    "lowQuality": False,
                },
            )
            native_pages += 1
            print(f"  {name} native text", file=sys.stderr)
            continue
        pixel_size = sizes[index] if matched else None
        try:
            recognized = ocr_pdf_page(binary, source, index, pixel_size)
        except RuntimeError as exc:
            print(f"  {name} skipped: {exc}", file=sys.stderr)
            low_quality += 1
            continue
        recognized["method"] = "vision-accurate"
        recognized["page"] = index + 1
        write_page(directory, name, recognized)
        ocr_pages += 1
        if recognized.get("lowQuality"):
            low_quality += 1
        print(
            f"  {name} vision rotation={recognized['rotation']} "
            f"confidence={recognized['meanConfidence']:.3f}",
            file=sys.stderr,
        )
    return {
        "pages": page_count,
        "nativePages": native_pages,
        "ocrPages": ocr_pages,
        "lowQualityPages": low_quality,
    }


def convert_word(binary: Path, source: Path, directory: Path) -> dict:
    native_name = "body"
    if not page_done(directory, native_name):
        text = word_text(source)
        write_page(
            directory,
            native_name,
            {
                "text": text,
                "method": "word-text" if text_is_usable(text) else "word-text-weak",
                "lowQuality": not text_is_usable(text),
            },
        )
        print(
            f"  body {'kept' if text_is_usable(text) else 'weak'} from Word",
            file=sys.stderr,
        )
    images = carved_jpegs(source, directory / "images")
    ocr_pages = 0
    low_quality = 0
    for image in images:
        name = image.stem
        if page_done(directory, name):
            ocr_pages += 1
            continue
        try:
            recognized = ocr_image(binary, image)
        except RuntimeError as exc:
            print(f"  {name} skipped: {exc}", file=sys.stderr)
            continue
        recognized["method"] = "vision-accurate"
        recognized["embeddedImage"] = image.name
        write_page(directory, name, recognized)
        ocr_pages += 1
        if recognized.get("lowQuality"):
            low_quality += 1
        print(
            f"  {name} vision rotation={recognized['rotation']} "
            f"confidence={recognized['meanConfidence']:.3f}",
            file=sys.stderr,
        )
    return {
        "ocrPages": ocr_pages,
        "lowQualityPages": low_quality,
        "embeddedImages": len(images),
    }


def convert_file(binary: Path, root: Path, output: Path, source: Path) -> dict:
    directory = work_dir(output, root, source)
    directory.mkdir(parents=True, exist_ok=True)
    print(source.relative_to(root), file=sys.stderr)
    if source.suffix.lower() == ".pdf":
        stats = convert_pdf(binary, source, directory)
    else:
        stats = convert_word(binary, source, directory)
    document = assemble(directory, source)
    stats["document"] = str(document)
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_DEFAULT)
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Defaults to <source>/converted",
    )
    parser.add_argument(
        "--only", action="append", default=[], help="File name substring to include"
    )
    parser.add_argument(
        "--include-backup",
        action="store_true",
        help="Also read Ordinances (NAS)/from Backup. Reference models stay excluded.",
    )
    args = parser.parse_args()
    source_root = args.source.expanduser().resolve()
    output = (args.output or (source_root / "converted")).expanduser().resolve()
    if not source_root.is_dir():
        print(f"Source folder not found: {source_root}", file=sys.stderr)
        return 1
    files = iter_sources(source_root, include_backup=args.include_backup)
    if args.only:
        files = [
            path for path in files if any(piece in str(path) for piece in args.only)
        ]
    if not files:
        print("No ordinance documents matched.", file=sys.stderr)
        return 1
    binary = engine_binary()
    output.mkdir(parents=True, exist_ok=True)
    manifest = []
    for path in files:
        stats = convert_file(binary, source_root, output, path)
        manifest.append({"source": str(path.relative_to(source_root)), **stats})
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({"files": len(manifest), "output": str(output)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
