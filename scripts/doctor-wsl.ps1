# Diagnose and recover WSL for Town of Wiley (run from PowerShell).
# Usage: npm run doctor:wsl
$ErrorActionPreference = 'Continue'

function Invoke-WslWithTimeout {
  param(
    [string[]]$WslArgs,
    [int]$TimeoutSec = 15
  )
  $job = Start-Job -ArgumentList ($WslArgs -join '|') -ScriptBlock {
    param([string]$ArgLine)
    $args = $ArgLine -split '\|'
    & wsl.exe @args 2>&1 | Out-String
  }
  $done = Wait-Job $job -Timeout $TimeoutSec
  if (-not $done) {
    Stop-Job $job | Out-Null
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    return $null
  }
  $out = (Receive-Job $job | Out-String).Trim()
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  return $out
}

Write-Host '== Town of Wiley WSL doctor ==' -ForegroundColor Cyan

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  Write-Host 'FAIL: wsl.exe not found. Install: winget install Microsoft.WSL' -ForegroundColor Red
  exit 1
}

$wslCount = (Get-Process -Name wsl -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "`n-- wsl.exe process count: $wslCount --"
if ($wslCount -gt 8) {
  Write-Host 'WARN: Many stuck wsl.exe processes (common after Cursor Agent). Run: npm run recover:wsl' -ForegroundColor Yellow
}

Write-Host "`n-- wsl --status (15s timeout) --"
$status = Invoke-WslWithTimeout -WslArgs @('--status') -TimeoutSec 15
if ($null -eq $status) {
  Write-Host 'FAIL: wsl --status timed out (WSL hung)' -ForegroundColor Red
} else {
  Write-Host $status
}

Write-Host "`n-- wsl --list --verbose (15s timeout) --"
$list = Invoke-WslWithTimeout -WslArgs @('--list', '--verbose') -TimeoutSec 15
if ($null -eq $list) {
  Write-Host 'FAIL: wsl --list timed out' -ForegroundColor Red
} else {
  Write-Host $list
}

Write-Host "`n-- Quick ping (15s timeout) --"
$ping = Invoke-WslWithTimeout -WslArgs @('-d', 'Ubuntu', '--', 'echo', 'WSL_OK') -TimeoutSec 15
if ("$ping" -match 'WSL_OK') {
  Write-Host 'OK: Ubuntu responds' -ForegroundColor Green
} else {
  Write-Host "FAIL: Ubuntu did not respond (got: $ping)" -ForegroundColor Red
  Write-Host 'Recovery: npm run recover:wsl  (Admin PowerShell if needed; quit Docker + Cursor first)'
  Write-Host 'Docs: docs/cursor-wsl-terminal.md'
  exit 1
}

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$unix = Invoke-WslWithTimeout -WslArgs @('-d', 'Ubuntu', 'wslpath', '-u', $root) -TimeoutSec 15
if ($null -eq $unix -or $LASTEXITCODE -ne 0) {
  Write-Host "WARN: wslpath failed for repo" -ForegroundColor Yellow
} else {
  Write-Host "`n-- Repo in WSL: $unix --"
  $nodeCheck = "cd '$($unix.Trim() -replace "'", "'\\''")' && (node -v || echo NODE_MISSING)"
  $nodeOut = Invoke-WslWithTimeout -WslArgs @('-d', 'Ubuntu', '-e', 'bash', '-lc', $nodeCheck) -TimeoutSec 30
  Write-Host "  node: $nodeOut"
  if ("$nodeOut" -match 'NODE_MISSING') {
    Write-Host 'Node not ready in WSL — run: npm run setup:wsl-terminal' -ForegroundColor Yellow
  }
}

Write-Host "`nDone. Reload Cursor (Developer: Reload Window) after fixing WSL." -ForegroundColor Cyan
