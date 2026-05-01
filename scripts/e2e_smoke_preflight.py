#!/usr/bin/env python3
"""
Fast-fail inventory before Playwright smoke / E2E runs.

Checks Node (vs package.json engines), npm, installed node_modules shims,
Chromium for the installed playwright-core, config paths, and optional E2E_NODE.

Exit code 0 only when every check passes. Use in CI after `playwright install`
and locally before `npm run test:e2e:smoke`.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    here = Path(__file__).resolve().parent.parent
    if not (here / "package.json").is_file():
        sys.stderr.write(
            "e2e_smoke_preflight.py: package.json not found next to scripts/\n"
        )
        sys.exit(2)
    return here


def load_package_json(root: Path) -> dict[str, Any]:
    data = json.loads((root / "package.json").read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("package.json root must be an object")
    return data


def allowed_node_majors(engines_node: str | None) -> set[int]:
    if not engines_node or not isinstance(engines_node, str):
        return set()
    return {int(m.group(1)) for m in re.finditer(r"\^(\d+)", engines_node)}


def run(cmd: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,
    )


def check_chromium_executable(root: Path) -> tuple[bool, str]:
    """Return (ok, message) using repo-local playwright-core."""
    snippet = r"""
const fs = require('fs');
const path = require('path');
const root = process.argv[1];
let chromium;
try {
  ({ chromium } = require(path.join(root, 'node_modules', 'playwright-core')));
} catch (e) {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
}
const exe = chromium.executablePath();
if (!exe) {
  console.error('playwright-core returned no chromium executable path');
  process.exit(1);
}
if (!fs.existsSync(exe)) {
  console.error(exe);
  process.exit(1);
}
process.stdout.write(exe);
""".strip()
    r = run(["node", "-e", snippet, str(root)], cwd=root)
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        hint = "Run: npx playwright install chromium  (or playwright install --with-deps chromium in CI)"
        return (
            False,
            f"Chromium executable missing or playwright-core not loadable.\n{err}\n{hint}",
        )
    return True, r.stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="E2E smoke preflight checks")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print one JSON object with check results to stdout",
    )
    args = parser.parse_args()
    root = repo_root()

    if not (os.environ.get("CI") or "").strip():
        pb = (os.environ.get("PLAYWRIGHT_BROWSERS_PATH") or "").strip()
        ephemeral = pb and re.search(r"cursor-sandbox|sandbox-cache", pb, re.I)
        if not pb or ephemeral:
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(
                Path.home() / ".cache" / "ms-playwright"
            )

    pkg = load_package_json(root)
    engines = pkg.get("engines") if isinstance(pkg.get("engines"), dict) else {}
    engines_node = engines.get("node") if isinstance(engines, dict) else None
    allowed = allowed_node_majors(
        engines_node if isinstance(engines_node, str) else None
    )

    rows: list[tuple[str, str, bool, str]] = []

    def row(name: str, detail: str, ok: bool, fix: str = "") -> None:
        rows.append((name, detail, ok, fix))

    # Node
    nr = run(["node", "-v"], cwd=root)
    node_ver = (nr.stdout or "").strip() if nr.returncode == 0 else ""
    node_major: int | None = None
    if node_ver.startswith("v"):
        try:
            node_major = int(node_ver[1:].split(".")[0])
        except ValueError:
            node_major = None
    node_ok = (
        nr.returncode == 0
        and node_major is not None
        and (not allowed or node_major in allowed)
    )
    detail = node_ver or (nr.stderr or "node not found").strip()
    fix = (
        ""
        if node_ok
        else (
            f"Use Node {' or '.join(str(x) for x in sorted(allowed, reverse=True))}.x (see package.json engines and .nvmrc)"
            if allowed
            else "Install Node.js LTS"
        )
    )
    row("node", detail, node_ok, fix)

    # npm
    npr = run(["npm", "-v"], cwd=root)
    npm_ok = npr.returncode == 0
    row(
        "npm",
        (npr.stdout or npr.stderr or "").strip(),
        npm_ok,
        "Install npm or fix PATH",
    )

    # Critical paths
    nm = root / "node_modules"
    need_dirs = [
        nm,
        nm / "@playwright" / "test",
        nm / "playwright-core",
        nm / "@angular" / "cli",
        root / "e2e" / "specs",
    ]
    need_files = [
        root / "playwright.config.ts",
        nm / "@angular" / "cli" / "bin" / "ng.js",
    ]
    for p in need_dirs:
        ok = p.is_dir()
        row(
            f"path:{p.relative_to(root)}",
            "directory" if ok else "missing",
            ok,
            "Run: npm ci",
        )
    for p in need_files:
        ok = p.is_file()
        row(
            f"path:{p.relative_to(root)}",
            "file" if ok else "missing",
            ok,
            "Run: npm ci",
        )

    # Optional E2E_NODE
    e2e_node = (os.environ.get("E2E_NODE") or "").strip()
    if e2e_node:
        p = Path(e2e_node)
        ok = p.is_file() and os.access(p, os.X_OK)
        row(
            "E2E_NODE",
            str(p),
            ok,
            "Point E2E_NODE at a Node binary (e.g. Homebrew node@24)",
        )

    # Chromium installed for this repo's playwright-core
    chrome_ok, chrome_msg = check_chromium_executable(root)
    row("playwright:chromium", chrome_msg if chrome_ok else chrome_msg[:500], chrome_ok)

    failed = [r for r in rows if not r[2]]
    if args.json:
        out = {
            "ok": len(failed) == 0,
            "root": str(root),
            "checks": [
                {
                    "name": n,
                    "detail": d,
                    "ok": ok,
                    "fix": fix,
                }
                for n, d, ok, fix in rows
            ],
        }
        print(json.dumps(out, indent=2))
        return 0 if not failed else 1

    # Human table
    w = max(len(r[0]) for r in rows) if rows else 10
    for name, detail, ok, fix in rows:
        status = "OK" if ok else "FAIL"
        line = f"{status:4}  {name:{w}}  {detail}"
        print(line, file=sys.stderr if not ok else sys.stdout)
        if not ok and fix:
            print(f"      → {fix}", file=sys.stderr)

    if failed:
        print(
            f"\ne2e_smoke_preflight: {len(failed)} check(s) failed. Fix the items above, then retry.",
            file=sys.stderr,
        )
        return 1
    print("\ne2e_smoke_preflight: all checks passed.", file=sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
