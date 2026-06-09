#!/usr/bin/env bash
# Town of Wiley — lightweight WSL shell init (safe to source from ~/.bashrc).
# Installed by: bash scripts/setup-repo-node.sh or npm run setup:wsl-terminal
set +u

export AWS_PROFILE="${AWS_PROFILE:-townofwiley}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-2}"

# Cursor Agent: plain prompt avoids broken inline output (cursor.com/docs/agent/tools/terminal).
if [[ -n "${CURSOR_AGENT:-}" ]]; then
  PS1='\u@\h:\W\$ '
fi

# Cursor/VS Code pass the workspace folder; cd so npm/node work without --cd on wsl.exe.
if [[ -n "${VSCODE_CWD:-}" ]]; then
  if [[ -d "${VSCODE_CWD}" ]]; then
    cd "${VSCODE_CWD}" 2>/dev/null || true
  elif command -v wslpath >/dev/null 2>&1 && [[ -d "$(wslpath -u "${VSCODE_CWD}" 2>/dev/null)" ]]; then
    cd "$(wslpath -u "${VSCODE_CWD}")" 2>/dev/null || true
  fi
fi

# Repo root: prefer VS Code/Cursor cwd, else walk up for .nvmrc
_tow_repo_root() {
  local dir="${VSCODE_CWD:-${PWD}}"
  while [[ -n "${dir}" && "${dir}" != "/" ]]; do
    if [[ -f "${dir}/.nvmrc" && -f "${dir}/package.json" ]]; then
      printf '%s' "${dir}"
      return 0
    fi
    dir="$(dirname "${dir}")"
  done
  return 1
}

if _tow_root="$(_tow_repo_root)"; then
  export TOW_REPO_ROOT="${_tow_root}"
  export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${_tow_root}/.playwright-browsers}"

  export NVM_DIR="${NVM_DIR:-${HOME}/.nvm}"
  if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"
    nvm use --silent 2>/dev/null || nvm use 2>/dev/null || true
  fi
fi

unset -f _tow_repo_root 2>/dev/null || true
set -u
