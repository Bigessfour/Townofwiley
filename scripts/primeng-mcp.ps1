# PrimeNG MCP launcher (Windows / PowerShell fallback).
# Delegates to scripts/primeng-mcp.mjs for cross-platform install + start logic.
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'primeng-mcp.mjs'
& node $launcher
