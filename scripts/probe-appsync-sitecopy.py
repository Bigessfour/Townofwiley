#!/usr/bin/env python3
"""Probe Gen1 AppSync for SiteCopy schema and listSiteCopies auth behavior."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API_ID = os.environ.get("APPSYNC_API_ID", "j7b2x3sh7rcezekekkxxiak7hi")
ENDPOINT = os.environ.get(
    "APPSYNC_ENDPOINT",
    "https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql",
)
API_KEY = (
    os.environ.get("APPSYNC_CMS_API_KEY", "").strip()
    or os.environ.get("APPSYNC_API_KEY", "").strip()
)
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")


def aws_json(cmd: list[str]) -> dict:
    import subprocess

    env = {**os.environ, "AWS_PROFILE": os.environ.get("AWS_PROFILE", "townofwiley")}
    out = subprocess.check_output(cmd, env=env, text=True)
    return json.loads(out)


def list_all_types() -> list[str]:
    names: list[str] = []
    token = None
    while True:
        cmd = [
            "aws",
            "appsync",
            "list-types",
            "--api-id",
            API_ID,
            "--format",
            "SDL",
            "--max-results",
            "25",
            "--region",
            REGION,
            "--output",
            "json",
        ]
        if token:
            cmd.extend(["--next-token", token])
        page = aws_json(cmd)
        names.extend(t["name"] for t in page.get("types", []))
        token = page.get("nextToken")
        if not token:
            break
    return sorted(names)


def get_type_sdl(type_name: str) -> str:
    data = aws_json(
        [
            "aws",
            "appsync",
            "get-type",
            "--api-id",
            API_ID,
            "--type-name",
            type_name,
            "--format",
            "SDL",
            "--region",
            REGION,
            "--output",
            "json",
        ]
    )
    return data.get("type", {}).get("definition", "")


def graphql(query: str, api_key: str | None) -> dict:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["x-api-key"] = api_key
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps({"query": query}).encode(),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    print(f"API_ID={API_ID}")
    print(f"ENDPOINT={ENDPOINT}")
    names = list_all_types()
    site_types = [n for n in names if "Site" in n or "Copy" in n]
    print("Site/Copy types:", ", ".join(site_types) or "(none)")
    for t in site_types:
        print(f"\n--- {t} SDL ---")
        print(get_type_sdl(t))

    queries = {
        "listSiteCopies_apiKey": (
            "query { listSiteCopies(limit: 2) { items { id key valueEn active } } }",
            API_KEY,
        ),
        "listAnnouncements_apiKey": (
            "query { listAnnouncements(limit: 2) { items { id title } } }",
            API_KEY,
        ),
    }
    for label, (q, key) in queries.items():
        print(f"\n--- {label} ---")
        try:
            result = graphql(q, key)
            print(json.dumps(result, indent=2)[:1200])
        except urllib.error.HTTPError as exc:
            print(f"HTTP {exc.code}: {exc.read().decode()[:800]}")
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR: {exc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
