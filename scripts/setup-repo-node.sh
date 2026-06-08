#!/usr/bin/env bash
# Align the current bash session with .nvmrc (nvm in WSL/Linux).
# Usage: bash scripts/setup-repo-node.sh
# From PowerShell use: .\scripts\setup-repo-node-wsl.ps1
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .nvmrc ]]; then
  echo "[setup-repo-node] .nvmrc not found at $ROOT/.nvmrc" >&2
  exit 1
fi

PIN="$(tr -d '[:space:]' < .nvmrc)"
export NVM_DIR="${HOME}/.nvm"

if [[ ! -s "${NVM_DIR}/nvm.sh" ]]; then
  echo "[setup-repo-node] Installing nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# shellcheck source=/dev/null
. "${NVM_DIR}/nvm.sh"

echo "[setup-repo-node] Pin from .nvmrc: ${PIN}"
nvm install "${PIN}"
nvm use "${PIN}"

VER="$(node -v)"
echo "[setup-repo-node] node -v => ${VER}"
if [[ ! "${VER}" =~ ^v24\. ]]; then
  echo "[setup-repo-node] WARNING: expected Node 24.x" >&2
fi

node "${ROOT}/scripts/ensure-node-version.mjs"
echo "[setup-repo-node] OK — use this shell for npm scripts."
