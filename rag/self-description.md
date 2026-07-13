# Town of Wiley codebase RAG (self-description)

**Engine:** JS local (`rag/js/`) — ripgrep boosts + lexical scoring over line/markdown chunks.  
**MCP server:** `townofwiley-rag` via `scripts/rag-mcp.mjs`.  
**CLI:** `npm run rag:query -- "…"`, `npm run rag:status`, `npm run rag:index`.

## Tools

| Tool | Purpose |
|------|---------|
| `search_codebase` | Ranked snippets with `path:start-end` |
| `rag_status` | Index health / discoverable file count |

## Indexed high-signal paths

`src/`, `docs/`, `e2e/`, `scripts/`, `infrastructure/` (including `terraform/`), `.github/workflows/`, `.github/actions/`, skills, instructions, cursor rules, agent markdown, `customHttp.yml`, `angular.json`, `package.json`, this `rag/` tree.

## Not indexed

`node_modules/`, `dist/`, secrets, lockfiles, generated CMS snapshots, binaries, `rag/.venv/`.

## Design goals

Local only, instant MCP start, no cloud API keys, generation stays in the IDE model.
