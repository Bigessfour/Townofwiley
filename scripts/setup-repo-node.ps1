# Align the current PowerShell session with .nvmrc (nvm-windows).
# Usage: .\scripts\setup-repo-node.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$nvmrc = Join-Path $root '.nvmrc'
if (-not (Test-Path $nvmrc)) {
  Write-Error ".nvmrc not found at $nvmrc"
}
$pin = (Get-Content $nvmrc -Raw).Trim()
Write-Host "[setup-repo-node] Pin from .nvmrc: $pin"
$nvm = Get-Command nvm -ErrorAction SilentlyContinue
if (-not $nvm) {
  Write-Error "nvm-windows not found. Install from https://github.com/coreybutler/nvm-windows"
}
& nvm install $pin 2>&1 | Out-Host
& nvm use $pin 2>&1 | Out-Host
$symlink = $env:NVM_SYMLINK
if (-not $symlink) {
  $symlink = 'C:\nvm4w\nodejs'
}
if (Test-Path (Join-Path $symlink 'node.exe')) {
  $env:Path = "$symlink;" + $env:Path
}
$ver = & node -v
Write-Host "[setup-repo-node] node -v => $ver"
if ($ver -notmatch '^v24\.') {
  Write-Warning "Expected Node 24.x. Check PATH order (Cursor node may be first). Run: `$env:Path = `"`$env:NVM_SYMLINK;`$env:Path`""
}
& node (Join-Path $root 'scripts\ensure-node-version.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[setup-repo-node] OK - use this shell for npm scripts."
