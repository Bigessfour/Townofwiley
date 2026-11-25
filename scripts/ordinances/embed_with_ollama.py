#!/usr/bin/env python3
"""Embed ordinance sections with local Ollama and write them to S3 Vectors.

The Bedrock knowledge base index is left empty. That index is tied to Titan
embeddings, and these vectors are a different model.
"""

from __future__ import annotations

import json
import subprocess
import urllib.request
from pathlib import Path

ACCOUNT = "818904800844"
PROFILE = "tow"
REGION = "us-east-2"
BUCKET = "tow-ordinance-source-818904800844"
VECTOR_BUCKET = "tow-ordinance-vectors-818904800844"
INDEX = "tow-ordinance-mxbai"
MODEL = "mxbai-embed-large"
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
OLLAMA = "http://127.0.0.1:11434/api/embed"
SOURCE = Path.home() / "Desktop/Town of Wiley Ordinances/ingest/source"
CHUNK = 1800
OVERLAP = 200


def account() -> str:
    result = subprocess.run(
        [
            "aws",
            "sts",
            "get-caller-identity",
            "--profile",
            PROFILE,
            "--query",
            "Account",
            "--output",
            "text",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text.strip()
    end = text.find("\n---", 4)
    if end < 0:
        return {}, text.strip()
    meta: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"')
    return meta, text[end + 4 :].strip()


def pieces(body: str) -> list[str]:
    body = body.strip()
    if len(body) <= CHUNK:
        return [body] if body else []
    parts: list[str] = []
    start = 0
    while start < len(body):
        end = min(len(body), start + CHUNK)
        if end < len(body):
            split = body.rfind("\n", start + CHUNK // 2, end)
            if split > start:
                end = split
        part = body[start:end].strip()
        if part:
            parts.append(part)
        if end >= len(body):
            break
        start = max(start + 1, end - OVERLAP)
    return parts


def records() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted(SOURCE.rglob("*.md")):
        meta, body = front_matter(path.read_text(encoding="utf-8", errors="replace"))
        relative = path.relative_to(SOURCE).as_posix()
        stem = relative[: -len(".md")]
        for number, part in enumerate(pieces(body)):
            rows.append(
                {
                    "key": f"{stem}-{number}",
                    "text": part,
                    "section": meta.get("section", ""),
                    "authority": meta.get("authority", "wiley-municipal-code"),
                    "sourceFile": meta.get("sourceFile", path.name),
                    "chapter": meta.get("chapter", ""),
                }
            )
    return rows


def embed(texts: list[str]) -> list[list[float]]:
    payload = json.dumps({"model": MODEL, "input": texts}).encode()
    request = urllib.request.Request(
        OLLAMA,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        data = json.load(response)
    vectors = data["embeddings"]
    if len(vectors) != len(texts) or any(len(vector) != 1024 for vector in vectors):
        raise RuntimeError("Ollama returned an unexpected embedding shape")
    return vectors


def put_vectors(batch: list[dict]) -> None:
    path = Path("/tmp/tow-mxbai-put.json")
    path.write_text(json.dumps(batch), encoding="utf-8")
    subprocess.run(
        [
            "aws",
            "s3vectors",
            "put-vectors",
            "--profile",
            PROFILE,
            "--region",
            REGION,
            "--vector-bucket-name",
            VECTOR_BUCKET,
            "--index-name",
            INDEX,
            "--vectors",
            f"file://{path}",
        ],
        check=True,
        capture_output=True,
        text=True,
    )


def main() -> None:
    seen = account()
    if seen != ACCOUNT:
        raise SystemExit(f"Refusing to upload. Profile {PROFILE} is account {seen}.")
    rows = records()
    print(f"passages {len(rows)}", flush=True)
    manifest_rows = []
    batch: list[dict] = []
    for start in range(0, len(rows), 8):
        group = rows[start : start + 8]
        vectors = embed([row["text"] for row in group])
        for row, vector in zip(group, vectors):
            batch.append(
                {
                    "key": row["key"],
                    "data": {"float32": vector},
                    "metadata": {
                        "section": row["section"],
                        "authority": row["authority"],
                        "sourceFile": row["sourceFile"],
                        "chapter": row["chapter"],
                        "text": row["text"],
                    },
                }
            )
            manifest_rows.append(
                {
                    key: row[key]
                    for key in (
                        "key",
                        "section",
                        "authority",
                        "sourceFile",
                        "chapter",
                        "text",
                    )
                }
            )
        if len(batch) >= 100:
            put_vectors(batch)
            batch = []
        print(f"embedded {min(start + 8, len(rows))}/{len(rows)}", flush=True)
    if batch:
        put_vectors(batch)

    out = Path("/tmp/tow-mxbai-passages.jsonl")
    out.write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in manifest_rows),
        encoding="utf-8",
    )
    info = {
        "model": MODEL,
        "dimensions": 1024,
        "distance": "cosine",
        "queryPrefix": QUERY_PREFIX,
        "index": INDEX,
        "vectorBucket": VECTOR_BUCKET,
        "passages": len(manifest_rows),
    }
    info_path = Path("/tmp/tow-mxbai-manifest.json")
    info_path.write_text(json.dumps(info, indent=2) + "\n", encoding="utf-8")
    for local, key in (
        (out, "vectors/mxbai-embed-large/passages.jsonl"),
        (info_path, "vectors/mxbai-embed-large/manifest.json"),
    ):
        subprocess.run(
            [
                "aws",
                "s3",
                "cp",
                str(local),
                f"s3://{BUCKET}/{key}",
                "--profile",
                PROFILE,
                "--region",
                REGION,
            ],
            check=True,
        )
    print(json.dumps(info), flush=True)


if __name__ == "__main__":
    main()
