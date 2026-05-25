"""Resolve npm for Lambda deploy scripts (Windows nvm-windows + POSIX PATH)."""

from __future__ import annotations

import os
import shutil
from pathlib import Path


def resolve_npm() -> str:
    npm = shutil.which("npm")
    if npm:
        return npm
    nvm_symlink = os.environ.get("NVM_SYMLINK", r"C:\nvm4w\nodejs")
    for candidate in (Path(nvm_symlink) / "npm.cmd", Path(nvm_symlink) / "npm"):
        if candidate.is_file():
            return str(candidate)
    raise RuntimeError(
        "npm not found on PATH. Windows: run .\\scripts\\setup-repo-node.ps1 "
        "or prepend %NVM_SYMLINK% to PATH before deploy."
    )


def npm_install_cmd(backend_dir: Path) -> list[str]:
    sub = (
        ["ci", "--omit=dev"]
        if (backend_dir / "package-lock.json").is_file()
        else ["install", "--omit=dev"]
    )
    return [resolve_npm(), *sub]
