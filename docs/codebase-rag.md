# Local codebase RAG

Semantic search over this repository for **IDE agents** (Cursor, VS Code Copilot, Grok). Embeddings run locally; **generation stays with your IDE model** (Claude, GPT, Grok, etc.).

## Architecture (current high-availability local implementation)

| Layer        | Technology                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| Search       | ripgrep (primary when available) + Node lexical + path/structural scoring  |
| Storage      | In-memory per-process (instant startup); optional manifest for incremental |
| Agent access | MCP `townofwiley-rag` (via WSL launch) or `npm run rag:query`              |

**Design goals (per user requirements)**: Local only (never deployed), WSL terminal environment, "instantly available" with no failing tool calls or long first-time setup, reusable via MCP tool + best-practice skill.

The original Python sentence-transformers + ChromaDB vision (see previous version of this doc) can be restored later by re-adding `rag/requirements.txt` + `rag/tow_rag/` package. The current JS implementation delivers the required reliability and zero-setup experience while covering the same high-signal paths.

## First-time setup (current reliable mode)

No Python or long setup required for instant availability.

```bash
# (optional) one-time environment sanity in WSL
npm run rag:setup
npm run rag:status          # should report "ok (JS local)" + file count
npm run rag:query -- "How does staff admin login work?"
```

The MCP server (`townofwiley-rag`) starts in <1s once the config uses the WSL launch (see `.grok/config.toml`).

Reload Cursor / VS Code / Grok after MCP config changes so **`townofwiley-rag`** appears in the tool list.

(If you want the heavier original Python `BAAI/bge-small-en-v1.5` + Chroma version, restore the requirements + tow_rag package and update the wrappers.)

## npm scripts

| Script                  | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `rag:setup`             | Create venv + `pip install -r rag/requirements.txt` |
| `rag:index`             | Full re-index                                       |
| `rag:index:incremental` | Only changed files (vs manifest hashes)             |
| `rag:query -- "…"`      | CLI search (markdown to stdout)                     |
| `rag:status`            | Manifest + stale vs `git HEAD`                      |
| `rag:test`              | Unit tests (chunking/format; no full index)         |

## MCP tools (preferred in Cursor)

Server name: **`townofwiley-rag`**

| Tool              | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `search_codebase` | `query` (required), `limit` (default 8), optional `path_prefix` |
| `rag_status`      | Index age, chunk counts, stale hint                             |

Configured in [`.cursor/mcp.json`](../.cursor/mcp.json), [`.vscode/mcp.json`](../.vscode/mcp.json), [`.grok/config.toml`](../.grok/config.toml).

## Agent workflow

1. **When**: Cross-cutting questions (“where is X handled?”), before 3+ speculative greps — after skimming `docs/` and `.cursor/rules/`.
2. **How**: MCP `search_codebase` or `npm run rag:query -- "…"`.
3. **Then**: Open cited `path:start-end` with the editor Read tool; snippets are not full files.
4. **Re-index**: If `rag_status` says stale or index missing → `npm run rag:index` (or `rag:index:incremental` after small edits).
5. **Skip RAG**: Exact symbol strings, secrets, live URLs — use grep instead.

See also [`.cursor/rules/codebase-rag.mdc`](../.cursor/rules/codebase-rag.mdc) and [`.github/copilot-instructions.md`](../.github/copilot-instructions.md).

## What gets indexed

High-signal paths: `src/`, `docs/`, `e2e/`, `scripts/`, `infrastructure/`, `rag/tow_rag/` (the RAG implementation itself), Amplify GraphQL/config, `.github/skills/`, `.github/instructions/`, `.cursor/rules/`, agent instruction markdown (AGENTS.md, .instructions.md, copilot-instructions, etc.).

**Never indexed**: `node_modules/`, `dist/`, `secrets/`, lockfiles, generated `public/cms-snapshot.json`, binaries, `rag/.venv/`.

## Troubleshooting

| Issue                                                    | Fix                                                                                                                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RAG venv missing`                                       | `npm run rag:setup`                                                                                                                                               |
| `RAG index missing`                                      | `npm run rag:index`                                                                                                                                               |
| Stale index after many commits                           | `npm run rag:index` or `rag:index:incremental`                                                                                                                    |
| MCP server not listed                                    | Reload window; ensure `npm run rag:setup` completed                                                                                                               |
| `No module named 'mcp.server'`                           | Cursor is not using the venv — run `npm run rag:setup`, confirm [`.cursor/mcp.json`](../.cursor/mcp.json) uses `node scripts/rag-mcp.mjs`, then reload the window |
| MCP log lines like `ListToolsRequest` shown as `[error]` | Usually **INFO on stderr**, not a failure — if status is `connected: true`, the server is healthy                                                                 |
| Slow first query                                         | Model download on first embed; normal                                                                                                                             |

## Implementation

- Wrappers (Node, WSL-launched): [`scripts/rag-mcp.mjs`](../scripts/rag-mcp.mjs) (MCP stdio server), [`scripts/rag-run.mjs`](../scripts/rag-run.mjs), [`scripts/rag-setup.mjs`](../scripts/rag-setup.mjs).
- Self-description for the RAG (indexed): [`rag/tow_rag/self-description.md`](../rag/tow_rag/self-description.md).
- The implementation is intentionally lightweight JS + ripgrep so the tool is **always available** the moment the MCP server starts (no venv, no model download, no multi-minute `rag:index` required for basic use).
