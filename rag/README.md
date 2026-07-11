# Local codebase RAG (JS)

High-availability semantic/lexical search for IDE agents. See [`docs/codebase-rag.md`](../docs/codebase-rag.md).

```bash
npm run rag:setup
npm run rag:status
npm run rag:index          # optional cache under .rag/
npm run rag:query -- "How does staff admin login work?"
npm run rag:test
```

MCP: **`townofwiley-rag`** → `scripts/rag-mcp.mjs` (project + global Grok/Cursor settings).

Optional env: `TOW_RAG_ROOT` = absolute path to this repository (used when the MCP is launched from another project).
