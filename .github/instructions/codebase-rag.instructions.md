---
applyTo: '**'
---

# Codebase RAG

Before broad repository exploration, use local JS codebase search documented in [`docs/codebase-rag.md`](../../docs/codebase-rag.md).

- CLI: `npm run rag:query -- "<question>"` (optional `npm run rag:index` for cache).
- MCP: **`townofwiley-rag`** → `search_codebase` / `rag_status` (project or global settings).
- Then read cited `path:line` ranges; re-index if `npm run rag:status` reports stale.
