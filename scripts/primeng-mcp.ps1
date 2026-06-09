# PrimeNG MCP launcher (Windows / PowerShell).
# Ensures pinned local install exists, then starts the stdio server.
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$entry = Join-Path $repoRoot 'mcp\primeng\node_modules\@primeng\mcp\dist\index.js'

if (-not (Test-Path -LiteralPath $entry)) {
  Push-Location $repoRoot
  try {
    npm run mcp:primeng:install
  } finally {
    Pop-Location
  }
  if (-not (Test-Path -LiteralPath $entry)) {
    Write-Error "PrimeNG MCP install failed. Run manually: npm run mcp:primeng:install"
    exit 1
  }
}

& node $entry
