# Recover hung WSL on Windows (Cursor Agent terminals can leave dozens of stuck wsl.exe).
# Usage (PowerShell):
#   npm run recover:wsl
# For service restart: right-click PowerShell → Run as administrator, then same command.
param(
  [switch]$SkipDockerHint
)

$ErrorActionPreference = 'Continue'

function Invoke-WithTimeout {
  param(
    [string]$Label,
    [scriptblock]$Script,
    [int]$TimeoutSec = 20
  )
  $job = Start-Job -ScriptBlock $Script
  $done = Wait-Job $job -Timeout $TimeoutSec
  if (-not $done) {
    Stop-Job $job | Out-Null
    Remove-Job $job -Force -ErrorAction SilentlyContinue
    Write-Host "  TIMEOUT: $Label (${TimeoutSec}s)" -ForegroundColor Red
    return $null
  }
  $out = Receive-Job $job
  Remove-Job $job -Force -ErrorAction SilentlyContinue
  if ($out) {
    Write-Host "  $out"
  }
  return $out
}

Write-Host '== Town of Wiley WSL recovery ==' -ForegroundColor Cyan

$wslCount = (Get-Process -Name wsl -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "`nStuck wsl.exe processes: $wslCount"
if ($wslCount -gt 5) {
  Write-Host '  (Cursor Agent sandbox/terminal often causes this - see docs/cursor-wsl-terminal.md)' -ForegroundColor Yellow
}

if (-not $SkipDockerHint) {
  $docker = Get-Process -Name 'Docker Desktop','com.docker.backend' -ErrorAction SilentlyContinue
  if ($docker) {
    Write-Host "`nDocker Desktop is running. Quit Docker before recovery if WSL stays hung." -ForegroundColor Yellow
  }
}

Write-Host "`n-- Step 1: kill user wsl.exe processes --"
& taskkill.exe /F /IM wsl.exe 2>&1 | ForEach-Object { Write-Host "  $_" }
Start-Sleep -Seconds 2

Write-Host "`n-- Step 2: wsl --shutdown (20s timeout) --"
$shutdownOk = Invoke-WithTimeout -Label 'wsl --shutdown' -TimeoutSec 20 -Script {
  & wsl.exe --shutdown 2>&1 | Out-String
}

Write-Host "`n-- Step 3: restart WSLService (needs Administrator) --"
try {
  Restart-Service WSLService -Force -ErrorAction Stop
  Write-Host '  WSLService restarted' -ForegroundColor Green
} catch {
  Write-Host "  Skipped (run this script in an elevated PowerShell): $_" -ForegroundColor Yellow
}

Start-Sleep -Seconds 3

Write-Host "`n-- Step 4: verify Ubuntu responds --"
$pingOut = Invoke-WithTimeout -Label 'wsl echo' -TimeoutSec 20 -Script {
  (& wsl.exe -d Ubuntu -- echo WSL_OK 2>&1 | Out-String).Trim()
}

if ($pingOut -and "$pingOut" -match 'WSL_OK') {
  Write-Host 'OK: WSL recovered. Reload Cursor and run: npm run setup:wsl-terminal' -ForegroundColor Green
  exit 0
}

Write-Host @'

WSL still not responding. Try in order:
  1. Close Cursor completely (all windows).
  2. Quit Docker Desktop.
  3. Run this script again in PowerShell as Administrator.
  4. wsl --shutdown
  5. Reboot Windows.
  6. npm run doctor:wsl
  7. npm run setup:wsl-terminal

Cursor: keep Legacy Terminal Tool ON (Settings → Agents → Inline Editing & Terminal).
'@ -ForegroundColor Yellow
exit 1
