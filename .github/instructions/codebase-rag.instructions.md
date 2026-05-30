---
applyTo: '**'
---

# Codebase RAG

Before broad repository exploration, use local semantic search documented in [`docs/codebase-rag.md`](../../docs/codebase-rag.md).

- CLI: `npm run rag:query -- "<question>"` (requires `npm run rag:setup` and `npm run rag:index` first).
- VS Code MCP: **`townofwiley-rag`** → `search_codebase`.
- Then read cited `path:line` ranges; re-index if `npm run rag:status` reports stale.
