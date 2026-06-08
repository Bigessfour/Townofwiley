# Copilot Instructions

## Node.js (mandatory for this repo)

- **Runtime:** Node **24.x LTS only** (`Krypton`). **Never** use Node 22, 23, 25+, or odd majors for npm/build/test in this workspace.
- **Pinned patch:** Read [`.nvmrc`](../.nvmrc) (currently **`24.16.0`**) — same version as GitHub Actions (`NODE_VERSION`) and historical Amplify builds (`amplify.yml`). This is an **exact CI/deploy pin**, not “ignore nodejs.org LTS.” When [nodejs.org](https://nodejs.org/en/blog/release/) ships a newer **24.x LTS patch**, bump all pin files in one PR (see checklist in [`docs/NODE_VERSION.md`](../docs/NODE_VERSION.md)). (Frontend hosting migrated to S3+CloudFront June 2026; Node pin remains for build/CI consistency.)
- **`package.json` `engines.node`:** `>=24.15.0 <25.0.0` — local **24.15.x** still passes `ensure-node-version`; prefer **`nvm use`** / **`mise install`** so `node -v` matches `.nvmrc`.
- **Why we cited 24.15.0 before:** That was the lock when PR #30 / Amplify last greened; **24.16.0** is the current Active LTS patch (May 2026). The repo upgrades the **pin** deliberately; it does not auto-track “latest 24” on every machine.
- **Before npm scripts:** `node scripts/ensure-node-version.mjs` (runs via `prestart` / `prebuild` / `pretest:e2e:smoke`).
- **Windows / Cursor agents:** `nvm use` alone is often **not enough** — Cursor’s `node.exe` can win on `PATH`. Run **`.\scripts\setup-repo-node.ps1`** from repo root, or `$env:Path = "$env:NVM_SYMLINK;$env:Path"` after `nvm use`. VS Code sets `PATH` with `NVM_SYMLINK` first in [`.vscode/settings.json`](../.vscode/settings.json) for integrated terminals only.
- **macOS agents:** `PATH="/opt/homebrew/opt/node@24/bin:$PATH"` before npm (see `.cursor/rules/core-workflow.mdc`).
- **Cleanup:** On nvm-windows, uninstall unused majors (`nvm uninstall 25.2.1`, old 24.14.x) after `24.16.0` is active — see [`docs/NODE_VERSION.md`](../docs/NODE_VERSION.md).
- **Docker fallback:** `docker pull node:24-slim` then mount the repo and run npm scripts (`node -v` → v24.16.0) — see **Docker** in [`docs/NODE_VERSION.md`](../docs/NODE_VERSION.md) when host PATH cannot be fixed quickly.
- **Emergency only:** `SKIP_NODE_VERSION_CHECK=1` — does not fix PATH; use Node 24 LTS instead.

## Angular Best Practices Are Mandatory

- For any Angular-specific task in this repository, follow `.cursor/rules/angular-standards.mdc` and `.cursor/rules/core-workflow.mdc`.
- Treat the Cursor rules (in `.cursor/rules/`) + `.instructions.md` + TownOfWiley-Dev skill as the source of truth for Angular, TypeScript, accessibility, component, state, template, and service guidance.
- If another instruction conflicts, prefer the `.cursor/rules/angular-standards.mdc`.

## Angular Reference Bundle

- For every Angular-specific prompt, consult `.cursor/rules/angular-standards.mdc`, root `llms.txt`, `.github/skills/angular-reference/SKILL.md`, and `.instructions.md`.
- Keep code changes aligned with the Cursor rules and existing `src/` patterns.

## Angular MCP Required

- For any Angular-specific task in this repository, use the Angular CLI MCP server before falling back to generic web knowledge or ad-hoc Angular guidance.
- Treat Angular CLI MCP as mandatory for Angular documentation lookup, best-practice guidance, Angular examples, workspace inspection, and Angular-aware test or build actions when the MCP tools are available.
- Prefer Angular MCP tools for Angular questions such as APIs, control flow, standalone patterns, signals, DI, routing, forms, HTTP, testing, and modernization guidance.
- Prefer Angular MCP workspace-aware tools before making Angular code changes when they can answer the question or validate the change.
- If Angular CLI MCP is unavailable, failing, or missing from the host environment, say that explicitly and then continue with the best available fallback.

## Angular MCP Priorities

- Use Angular MCP documentation and best-practice tools before external searches for Angular framework guidance.
- Use Angular MCP example and project inspection tools before inventing Angular patterns.
- Use Angular MCP test, build, devserver, or e2e tools when they are available through the connected host instead of bypassing them.

## Repository Context

- This is an Angular workspace and Angular-specific recommendations should align with current Angular documentation and CLI-supported practices.
- Keep Angular solutions consistent with standalone components, modern Angular syntax, and current Angular guidance whenever Angular CLI MCP confirms that approach.

## Terminal Policy

- This workspace allows `curl.exe` and `Invoke-WebRequest` for HTTP operations, including diagnostics, API calls, and data retrieval from live sites, AWS, or health endpoints.
- HTTP commands that send a body or use mutating methods such as `POST`, `PUT`, `PATCH`, or `DELETE` should still require confirmation.
- When direct shell web utilities are blocked by host policy, prefer Python `urllib` or .NET `HttpClient` as the fallback for the same diagnostic purpose.

## Codebase RAG — MANDATORY before any code inspection or edits

**This is a hard requirement for all agent turns.**

You **MUST** query the RAG system for relevant current context **before**:
- Reading any source file (`src/`, `docs/`, scripts, etc.) with the intent to understand it for modification.
- Planning, describing, or applying **any** code change, `search_replace`, or edit.
- Proposing refactors, new components, CMS models, copy changes, or config updates.

**Required workflow (every time):**
1. Formulate a precise question about the area/feature you are about to touch (e.g. "how APP_COPY topTasks and navigation labels are structured and consumed in app.ts and app.html", "current SiteCopy or generic CMS admin patterns", "how LocalizedCmsContentStore loads public models").
2. Call the RAG:
   - **Preferred and always-available**: MCP server **`townofwiley-rag`** (launched via WSL) tool `search_codebase`. Use this first for any codebase, infra, skills, or agent-instruction questions.
   - Fallback: `npm run rag:query -- "your precise question"` (run from repo root).
3. Review the returned chunks (they include `path:startLine-endLine` citations).
4. **Only then** use the Read tool on the specific cited file ranges.
5. Proceed with understanding + edit only after incorporating the RAG results.

This ensures maximum up-to-date semantic context from the full indexed corpus (`src/`, docs, e2e, scripts, infrastructure, all instruction files, skills, RAG implementation itself, etc.) before any manipulation.

- Re-index with `npm run rag:index:incremental` (or full `npm run rag:index`) when `npm run rag:status` or `rag_status` MCP tool reports the index is stale or missing.
- Use exact `grep` only for symbol/string lookups after RAG has given you the broader picture.
- The RAG section in [`docs/codebase-rag.md`](../docs/codebase-rag.md) and [`.cursor/rules/codebase-rag.mdc`](../.cursor/rules/codebase-rag.mdc) are the detailed runbooks.

Violating this (editing without prior RAG retrieval for the affected area) produces lower-quality, out-of-context changes.

## Codebase RAG (local semantic search) — quick reference

- Setup (first time or after venv issues): `npm run rag:setup && npm run rag:index`
- Query: MCP `townofwiley-rag` → `search_codebase` or `npm run rag:query -- "<question>"`
- Status: `npm run rag:status` or MCP `rag_status`
- The index covers high-signal paths including all agent instructions. Generation always stays with the IDE model (RAG only retrieves).

## Cursor / Copilot Agent Auto-Approval Policy

See the full **Cursor Agent Auto-Approval & Execution Policy** in [`.cursor/rules/core-workflow.mdc`](../.cursor/rules/core-workflow.mdc).

In short:

- Auto-approve routine compliant development work.
- Ask on destructive, mutating, or high-risk operations.
- A terminal safety hook is active (`.cursor/hooks/pre_tool_use.py`).

## Cursor/Grok 4.20 Tool Usage & Workflow

- Follow all system instructions: Read files before editing (use Read tool), use StrReplace for precise edits with unique context (3-5+ lines), TodoWrite for complex tasks, CallMcpTool for MCP servers (angular-cli, primeng, playwright-mcp, cursor-ide-browser).
- ALWAYS review `.cursor/rules/*.mdc` and `.instructions.md` first for this workspace.
- For Angular tasks: Use CallMcpTool with angular-cli or primeng servers before generic edits. Prefer MCP for best practices.
- For complex/multi-step work: Use TodoWrite tool proactively to plan/track.
- Editing: Read first, use exact string matches in StrReplace (never guess), prefer minimal targeted changes matching existing patterns. Use CODE REFERENCES format for existing code citations.
- Incorporate rules from `.cursor/rules/`, TownOfWiley-Dev skill, accessibility expectations, MCP priority, and git workflow (no destructive commands unless requested).
- Keep responses focused on task. Use markdown code blocks only per tone guidelines. Prefer implementation aligned with rules.
- Default to PrimeNG + Angular 21 standalone/signals/OnPush/native control flow, WCAG AA, Trunk formatting.

## Pipeline workflow (CI/CD — mandatory reference)

Full runbook: [`docs/pipeline-workflow.md`](../docs/pipeline-workflow.md). Production deploy is **GitHub Actions → S3 + CloudFront** on merge to `main` (not Amplify Hosting).

### Every agent session (shell)

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # macOS Homebrew Node 24
source scripts/agent-aws-env.sh
node -v && aws sts get-caller-identity
```

### Runtime secrets (strict build + CI)

Required keys: [`infrastructure/amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json) → `requiredForProduction`.

```bash
source scripts/agent-aws-env.sh
npm run pipeline:secrets                   # sync + lock + strict checks
npm run secrets:sync-runtime -- --github     # mirror GitHub Actions secrets
npm run generate:runtime-config:strict
npm run test:runtime-config-strict
```

After Lambda deploys or AppSync key rotation, re-run sync before expecting green CI/local `npm run build`.

### Before PR / local validation (frontend changes)

```bash
npm ci --prefer-offline --no-audit
npm run lint
npm run test:vitest
npm run build
npm run test:e2e:smoke
trunk check --fix
```

Required merge check name: **`site-ci / CI gate (merge required)`**. Deploy runs on push to `main` when `app_changed` — see [`docs/github-actions-production-deploy.md`](../docs/github-actions-production-deploy.md).

### Break-glass deploy (human only — confirm with user)

```bash
source scripts/agent-aws-env.sh
npm run deploy:site
# or: npm run deploy:ansible:dry / npm run deploy:ansible
```

CI failures: `gh run view <run-id> --log-failed` — not Grok fetch of GitHub URLs.
