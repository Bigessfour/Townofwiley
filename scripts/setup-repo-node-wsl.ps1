# Run setup-repo-node.sh inside Ubuntu WSL from PowerShell (not from inside WSL).
# Usage:
#   cd "C:\Users\biges\Desktop\Personal Github\Town Website"
#   .\scripts\setup-repo-node-wsl.ps1
# Or: npm run setup:node:wsl
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "[setup-repo-node-wsl] Windows: $root"

$wsl = Get-Command wsl.exe -ErrorAction SilentlyContinue
if (-not $wsl) {
  Write-Error 'wsl.exe not found. Install: winget install Microsoft.WSL'
}

$unix = (& wsl.exe -d Ubuntu wslpath -u $root).Trim()
Write-Host "[setup-repo-node-wsl] WSL path: $unix"
Write-Host '[setup-repo-node-wsl] Starting Ubuntu (first run: 2-5 min while nvm + Node download)...'

$inner = "set -e; cd '$($unix -replace "'", "'\\''")'; sed -i 's/\r$//' scripts/setup-repo-node.sh 2>/dev/null || true; bash scripts/setup-repo-node.sh"
& wsl.exe -d Ubuntu -e bash -lc $inner

if ($LASTEXITCODE -ne 0) {
  Write-Host '[setup-repo-node-wsl] Failed. If WSL hung, run: wsl --shutdown'
  Write-Host '[setup-repo-node-wsl] Or use Windows Node only: npm run setup:node'
  exit $LASTEXITCODE
}
