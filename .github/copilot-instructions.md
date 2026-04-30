# Copilot Instructions

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
