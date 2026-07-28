# Local codebase RAG

Semantic / lexical search over this repository for **IDE agents** (Cursor, VS Code Copilot, Grok). **Generation stays with your IDE model** (Claude, GPT, Grok, etc.).

## Architecture (current high-availability implementation)

| Layer        | Technology                                                                |
| ------------ | ------------------------------------------------------------------------- |
| Search       | ripgrep (boost when available) + Node lexical + path/structural scoring |
| Storage      | In-memory on demand; optional cache under `.rag/js-index.json`            |
| Agent access | MCP **`townofwiley-rag`** (native Node) or `npm run rag:query`            |

**Design goals:** Local only (never deployed), instantly available, no failing tool calls or long first-time setup, reusable via MCP + project rules.

> Legacy Python (sentence-transformers + Chroma) is **not** required. Optional local leftovers under `rag/tow_rag/` are gitignored.

## First-time setup

```bash
npm run rag:setup
npm run rag:status          # should report "ok (JS local)" + file counts
npm run rag:index           # optional — writes .rag/ for faster MCP warm start
npm run rag:query -- "How does staff admin login work?"
npm run rag:test
```

No Python venv. Node **20+** (repo pins **24.x**).

Reload Cursor / VS Code / Grok after MCP config changes so **`townofwiley-rag`** appears in the tool list.

## npm scripts

| Script                  | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `rag:setup`             | Sanity check + create `.rag/`                    |
| `rag:index`             | Full chunk index → `.rag/js-index.json`          |
| `rag:index:incremental` | Refresh index (currently full rebuild; fast)     |
| `rag:query -- "…"`      | CLI search (markdown to stdout)                  |
| `rag:status`            | Manifest + stale vs git HEAD + discoverable files |
| `rag:test`              | Unit tests (globs, discover, search smoke)       |

## MCP tools

Server name: **`townofwiley-rag`**

| Tool              | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `search_codebase` | `query` (required), `limit` (default 8), optional `path_prefix` |
| `rag_status`      | Index age, chunk counts, engine, stale hint                     |

### Project config

- [`.cursor/mcp.json`](../.cursor/mcp.json)
- [`.vscode/mcp.json`](../.vscode/mcp.json)
- [`.grok/config.toml`](../.grok/config.toml)

### Global config (available in other projects)

When working outside this repo, point MCP at this tree with **`TOW_RAG_ROOT`**:

| Client | Location |
| ------ | -------- |
| Grok Build | `~/.grok/config.toml` → `[mcp_servers.townofwiley-rag]` |
| Cursor | `~/.cursor/mcp.json` → `townofwiley-rag` |
| Launcher | `~/.cursor/scripts/townofwiley-rag-mcp.sh` |

```bash
# Env used by the global launcher (must be the real clone path — not a removed iCloud path)
export TOW_RAG_ROOT="/absolute/path/to/Townofwiley"
```

## Agent workflow

1. **When:** Cross-cutting “where is X?” questions — after skimming `docs/` / rules, before 3+ speculative greps.
2. **How:** MCP `search_codebase` or `npm run rag:query -- "…"`.
3. **Then:** Open cited `path:start-end` with the editor Read tool; snippets are not full files.
4. **Re-index:** If `rag_status` says stale → `npm run rag:index` (or `rag:index:incremental`).
5. **Skip RAG:** Exact symbol strings, secrets, live URLs — use grep instead.

See also [`.cursor/rules/codebase-rag.mdc`](../.cursor/rules/codebase-rag.mdc).

## What gets indexed

High-signal paths: `src/`, `docs/`, `e2e/`, `scripts/`, `infrastructure/` (including `infrastructure/terraform/`), `.github/workflows/`, `.github/actions/`, Amplify GraphQL/config, `.github/skills/`, `.github/instructions/`, `.cursor/rules/`, agent instruction markdown, `customHttp.yml`, `angular.json`, `package.json`, `rag/js/`, `rag/*.md`.

**Never indexed:** `node_modules/`, `dist/`, `secrets/`, lockfiles, generated `public/cms-snapshot.json`, binaries, `rag/.venv/`.

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| MCP server not listed | Reload window; confirm `scripts/rag-mcp.sh` exists |
| Stuck on “loading tools” | Cursor MCP often has no Homebrew `node` on PATH. Project config must use `bash scripts/rag-mcp.sh` + Node 24 on `PATH` (see `.cursor/mcp.json`). Then **MCP: Restart Servers** or reload the window. |
| Empty / weak results | `npm run rag:index`; try a more specific query or `path_prefix` |
| Stale after large commits | `npm run rag:index` |
| Global MCP fails | Point `TOW_RAG_ROOT` / `~/.cursor/scripts/townofwiley-rag-mcp.sh` at this repo’s absolute path (not the old iCloud path) |
| ripgrep missing | Optional — install `rg` for boosts; lexical search still works |

## Implementation

| Path | Role |
| ---- | ---- |
| [`rag/js/`](../rag/js/) | Core: config, discover, chunk, search, MCP, CLI |
| [`scripts/rag-mcp.mjs`](../scripts/rag-mcp.mjs) | MCP launcher |
| [`scripts/rag-run.mjs`](../scripts/rag-run.mjs) | npm CLI bridge |
| [`rag/self-description.md`](../rag/self-description.md) | Indexed meta-doc for agents |

Search does **not** require a pre-built index (in-memory discover + chunk on first use). Indexing is recommended for faster cold starts.
