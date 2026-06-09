# Configure Ubuntu WSL for Town of Wiley terminals (Node 24, bashrc hook, AWS env).
# Usage: npm run setup:wsl-terminal
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Write-Host "[setup-wsl-terminal] Repo: $root" -ForegroundColor Cyan

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  Write-Error 'wsl.exe not found. Install: winget install Microsoft.WSL'
}

Write-Host '[setup-wsl-terminal] Restarting WSL (wsl --shutdown)...'
& wsl.exe --shutdown 2>$null
Start-Sleep -Seconds 2

$ping = (& wsl.exe -d Ubuntu -- echo WSL_READY 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or "$ping" -notmatch 'WSL_READY') {
  Write-Host "[setup-wsl-terminal] WSL not responding (got: $ping). Run: npm run doctor:wsl" -ForegroundColor Red
  exit 1
}

$unix = (& wsl.exe -d Ubuntu wslpath -u $root).Trim()
Write-Host "[setup-wsl-terminal] WSL path: $unix"

$escapedUnix = $unix -replace "'", "'\\''"
$installInit = "set -e; mkdir -p ~/.config/townofwiley; cp '$escapedUnix/scripts/wsl-terminal-init.sh' ~/.config/townofwiley/wsl-terminal-init.sh; chmod +x ~/.config/townofwiley/wsl-terminal-init.sh; MARKER='# Town of Wiley WSL terminal init'; grep -Fq `"`$MARKER`" ~/.bashrc 2>/dev/null || printf '\n%s\n[[ -f \"\${HOME}/.config/townofwiley/wsl-terminal-init.sh\" ]] && source \"\${HOME}/.config/townofwiley/wsl-terminal-init.sh\"\n' `"`$MARKER`" >> ~/.bashrc"
& wsl.exe -d Ubuntu -e bash -lc $installInit
if ($LASTEXITCODE -ne 0) {
  Write-Error 'Failed to install WSL terminal init hook'
}

Write-Host '[setup-wsl-terminal] Running setup-repo-node.sh (nvm + Node 24)...'
& (Join-Path $PSScriptRoot 'setup-repo-node-wsl.ps1')

Write-Host '[setup-wsl-terminal] OK — reload Cursor, open a new Ubuntu (WSL) terminal.' -ForegroundColor Green
