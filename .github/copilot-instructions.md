# Copilot Instructions

## Node.js (mandatory for this repo)

- **Runtime:** Node **24.x LTS only** (`Krypton`). **Never** use Node 22, 23, 25+, or odd majors for npm/build/test in this workspace.
- **Pinned patch:** Read [`.nvmrc`](../.nvmrc) (currently **`24.16.0`**) — same version as Amplify (`amplify.yml`) and GitHub Actions (`NODE_VERSION`). This is an **exact CI/deploy pin**, not “ignore nodejs.org LTS.” When [nodejs.org](https://nodejs.org/en/blog/release/) ships a newer **24.x LTS patch**, bump all pin files in one PR (see checklist in [`docs/NODE_VERSION.md`](../docs/NODE_VERSION.md)).
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

## Cursor/Grok 4.20 Tool Usage & Workflow

- Follow all system instructions: Read files before editing (use Read tool), use StrReplace for precise edits with unique context (3-5+ lines), TodoWrite for complex tasks, CallMcpTool for MCP servers (angular-cli, primeng, playwright-mcp, cursor-ide-browser).
- ALWAYS review `.cursor/rules/*.mdc` and `.instructions.md` first for this workspace.
- For Angular tasks: Use CallMcpTool with angular-cli or primeng servers before generic edits. Prefer MCP for best practices.
- For complex/multi-step work: Use TodoWrite tool proactively to plan/track.
- Editing: Read first, use exact string matches in StrReplace (never guess), prefer minimal targeted changes matching existing patterns. Use CODE REFERENCES format for existing code citations.
- Incorporate rules from `.cursor/rules/`, TownOfWiley-Dev skill, accessibility expectations, MCP priority, and git workflow (no destructive commands unless requested).
- Keep responses focused on task. Use markdown code blocks only per tone guidelines. Prefer implementation aligned with rules.
- Default to PrimeNG + Angular 21 standalone/signals/OnPush/native control flow, WCAG AA, Trunk formatting.
