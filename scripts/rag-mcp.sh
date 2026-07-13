#!/usr/bin/env bash
# Thin shell entry for MCP (cross-platform users may prefer scripts/rag-mcp.mjs).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export TOW_RAG_ROOT="${TOW_RAG_ROOT:-$ROOT}"
exec node "$ROOT/scripts/rag-mcp.mjs"
