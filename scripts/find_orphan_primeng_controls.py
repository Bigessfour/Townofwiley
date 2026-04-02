#!/usr/bin/env python3
"""Scan Angular source for PrimeNG control imports that are not wired into templates.

This is a heuristic audit tool for the app source tree. It looks for PrimeNG
module imports in standalone Angular components, checks whether those modules
are listed in the component's `imports` array, and then looks for the matching
PrimeNG selectors in the component template.

Usage:
  python scripts/find_orphan_primeng_controls.py
  python scripts/find_orphan_primeng_controls.py --root . --json
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import re
from pathlib import Path
from typing import Iterable

PRIMENG_MODULE_SELECTORS: dict[str, list[str]] = {
    "AvatarModule": ["p-avatar"],
    "BadgeModule": ["p-badge"],
    "ButtonModule": ["p-button", "pButton"],
    "CardModule": ["p-card"],
    "ChipModule": ["p-chip"],
    "DatePickerModule": ["p-datepicker"],
    "DialogModule": ["p-dialog"],
    "DividerModule": ["p-divider"],
    "IconFieldModule": ["p-iconfield"],
    "InputGroupModule": ["p-inputgroup"],
    "InputIconModule": ["p-inputicon"],
    "InputTextModule": ["p-inputtext", "pInputText"],
    "MenubarModule": ["p-menubar"],
    "MessageModule": ["p-message"],
    "ScrollPanelModule": ["p-scrollPanel", "p-scrollpanel"],
    "SelectModule": ["p-select"],
    "SkeletonModule": ["p-skeleton"],
    "TableModule": ["p-table", "pSortableColumn", "p-sortIcon"],
    "TabsModule": ["p-tabs", "p-tablist", "p-tab", "p-tabpanel", "p-tabpanels"],
    "TooltipModule": ["p-tooltip", "pTooltip"],
    "TextareaModule": ["pTextarea", "p-textarea"],
    "ToastModule": ["p-toast"],
    "RippleModule": ["pRipple"],
    "MenuModule": ["p-menu"],
    "MegaMenuModule": ["p-megamenu"],
    "PanelMenuModule": ["p-panelMenu", "p-panelmenu"],
    "TieredMenuModule": ["p-tieredMenu", "p-tieredmenu"],
    "BreadcrumbModule": ["p-breadcrumb"],
    "ContextMenuModule": ["p-contextmenu"],
    "DockModule": ["p-dock"],
    "SpeedDialModule": ["p-speeddial"],
    "SplitButtonModule": ["p-splitButton", "p-splitbutton"],
}

TEMPLATE_URL_RE = re.compile(r"templateUrl\s*:\s*['\"](?P<url>[^'\"]+)['\"]")
TEMPLATE_INLINE_RE = re.compile(r"template\s*:\s*`(?P<template>[\s\S]*?)`", re.MULTILINE)
IMPORTS_ARRAY_RE = re.compile(r"imports\s*:\s*\[(?P<imports>[\s\S]*?)\]", re.MULTILINE)
PRIMENG_IMPORT_STATEMENT_RE = re.compile(
    r"^import\s+(?:type\s+)?(?P<clause>[\s\S]+?)\s+from\s+['\"](?P<source>primeng/[^'\"]+)['\"]\s*;?\s*$",
    re.MULTILINE,
)


@dataclasses.dataclass(slots=True)
class PrimeNgImportFinding:
    file: str
    module: str
    symbol: str
    wired_in_imports: bool
    selectors_found: list[str]
    status: str
    template_file: str | None


@dataclasses.dataclass(slots=True)
class FileReport:
    file: str
    findings: list[PrimeNgImportFinding]


def kebab_to_selector(name: str) -> str:
    return name.replace("Module", "")


def extract_import_symbols(import_clause: str) -> list[str]:
    if import_clause.startswith("{") and import_clause.endswith("}"):
        content = import_clause[1:-1].strip()
        if not content:
            return []
        symbols: list[str] = []
        for part in content.split(","):
            symbol = part.strip()
            if not symbol:
                continue
            if " as " in symbol:
                symbol = symbol.split(" as ", 1)[0].strip()
            symbols.append(symbol)
        return symbols
    return []


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def resolve_template_path(ts_path: Path, source_text: str) -> tuple[str | None, str | None]:
    template_inline = TEMPLATE_INLINE_RE.search(source_text)
    if template_inline:
        return None, template_inline.group("template")

    template_url = TEMPLATE_URL_RE.search(source_text)
    if not template_url:
        return None, None

    template_path = (ts_path.parent / template_url.group("url")).resolve()
    if not template_path.exists():
        return str(template_path), None

    return str(template_path), read_text(template_path)


def get_component_imports_block(source_text: str) -> str:
    match = IMPORTS_ARRAY_RE.search(source_text)
    return match.group("imports") if match else ""


def iter_import_statements(source_text: str) -> Iterable[str]:
    statement_lines: list[str] = []
    collecting = False

    for line in source_text.splitlines():
        stripped = line.strip()
        if not collecting and stripped.startswith("import "):
            collecting = True
            statement_lines = [line]
            if ";" in line:
                yield line
                collecting = False
                statement_lines = []
            continue

        if collecting:
            statement_lines.append(line)
            if ";" in line:
                yield "\n".join(statement_lines)
                collecting = False
                statement_lines = []

    if collecting and statement_lines:
        yield "\n".join(statement_lines)


def find_primeng_imports(source_text: str) -> list[tuple[str, str]]:
    findings: list[tuple[str, str]] = []

    for statement in iter_import_statements(source_text):
        match = PRIMENG_IMPORT_STATEMENT_RE.match(statement.strip())
        if not match:
            continue

        source = match.group("source")
        clause = match.group("clause")
        for symbol in extract_import_symbols(clause):
            findings.append((source, symbol))
    return findings


def selectors_for_module(module_symbol: str) -> list[str]:
    if module_symbol in PRIMENG_MODULE_SELECTORS:
        return PRIMENG_MODULE_SELECTORS[module_symbol]

    if module_symbol.endswith("Module"):
        base = module_symbol[:-6]
        kebab = re.sub(r"(?<!^)(?=[A-Z])", "-", base).lower()
        return [f"p-{kebab}"]

    return []


def selectors_found_in_template(template: str, selectors: Iterable[str]) -> list[str]:
    found: list[str] = []
    for selector in selectors:
        if selector and selector in template:
            found.append(selector)
    return found


def analyze_file(ts_path: Path) -> FileReport | None:
    try:
        source_text = read_text(ts_path)
    except (PermissionError, UnicodeDecodeError, OSError):
        return None
    primeng_imports = find_primeng_imports(source_text)
    if not primeng_imports:
        return None

    imports_block = get_component_imports_block(source_text)
    template_path, template_text = resolve_template_path(ts_path, source_text)
    template_text = template_text or ""

    findings: list[PrimeNgImportFinding] = []
    for module_source, symbol in primeng_imports:
        if module_source in {"primeng/api", "primeng/config"}:
            continue

        selectors = selectors_for_module(symbol)
        wired_in_imports = symbol in imports_block
        selectors_found = selectors_found_in_template(template_text, selectors) if template_text else []

        if wired_in_imports and selectors_found:
            status = "wired"
        elif wired_in_imports and not selectors_found:
            status = "orphan-import"
        elif not wired_in_imports and selectors_found:
            status = "template-usage-without-import"
        else:
            status = "unused-import"

        findings.append(
            PrimeNgImportFinding(
                file=str(ts_path),
                module=module_source,
                symbol=symbol,
                wired_in_imports=wired_in_imports,
                selectors_found=selectors_found,
                status=status,
                template_file=template_path,
            )
        )

    return FileReport(file=str(ts_path), findings=findings)


def iter_source_files(root: Path) -> Iterable[Path]:
    ignored_parts = {"node_modules", "dist", "test-results", "playwright-report", "__pycache__"}
    for pattern in ("src/**/*.ts", "src/**/*.html"):
        for path in root.glob(pattern):
            if any(part in ignored_parts or part.startswith("__") for part in path.parts):
                continue
            yield path


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit PrimeNG controls for orphaned imports.")
    parser.add_argument("--root", default=".", help="Repository root to scan (default: current directory).")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of a text report.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    reports: list[FileReport] = []

    seen: set[Path] = set()
    for file_path in iter_source_files(root):
        if file_path in seen:
            continue
        seen.add(file_path)
        if file_path.suffix.lower() != ".ts":
            continue
        report = analyze_file(file_path)
        if report is not None and report.findings:
            reports.append(report)

    if args.json:
        payload = [
            {
                "file": report.file,
                "findings": [dataclasses.asdict(finding) for finding in report.findings],
            }
            for report in reports
        ]
        print(json.dumps(payload, indent=2))
        return 0

    total = sum(len(report.findings) for report in reports)
    wired = sum(1 for report in reports for finding in report.findings if finding.status == "wired")
    orphans = [
        finding
        for report in reports
        for finding in report.findings
        if finding.status in {"orphan-import", "unused-import", "template-usage-without-import"}
    ]

    print(f"Scanned {root}")
    print(f"PrimeNG imports found: {total}")
    print(f"Wired controls: {wired}")
    print(f"Potential issues: {len(orphans)}")

    if orphans:
        print()
        print("Potentially orphaned or miswired PrimeNG controls:")
        for finding in orphans:
            selector_list = ", ".join(finding.selectors_found) if finding.selectors_found else "(no matching selectors found)"
            template_file = finding.template_file or "(inline template or none)"
            print(
                f"- {finding.file}: {finding.symbol} from {finding.module} -> {finding.status}; "
                f"template={template_file}; matched={selector_list}"
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
