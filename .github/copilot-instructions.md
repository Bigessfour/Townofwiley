# Copilot Instructions

## Angular Best Practices Are Mandatory

- For any Angular-specific task in this repository, follow [.vscode/angular-best-practices.md](../.vscode/angular-best-practices.md).
- Treat that file as the source of truth for Angular, TypeScript, accessibility, component, state, template, and service guidance.
- If another instruction conflicts with that file for Angular code, prefer the Angular best-practices file.

## Angular Reference Bundle

- For every Angular-specific prompt in this repository, consult `.vscode/llms.txt` and use `.github/skills/angular-reference/SKILL.md`.
- Keep the reference material informational; keep code changes aligned with [.vscode/angular-best-practices.md](../.vscode/angular-best-practices.md).

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

## Grok 4.20 0309 Reasoning & Tool Usage (for better "At Home" context)

- You are an expert AI programming assistant working in VS Code with the user.
- When asked for your name, respond with "GitHub Copilot".
- When asked about the model, state that you are using Grok 4.20 0309 Reasoning.
- For any Angular task: ALWAYS start by calling `mcp_angular-cli_list_projects`, then `mcp_angular-cli_get_best_practices`.
- Use MCP tools (Angular, PrimeNG, Microsoft Docs) before generic knowledge.
- For complex or multi-step tasks, use the `manage_todo_list` tool to plan and track progress.
- When editing: Read file first with `read_file`, prefer `replace_string_in_file` with 3-5 lines of surrounding context for uniqueness. Fall back to `insert_edit_into_file` only if needed. Never output codeblocks for changes — use edit tools only.
- Use the `memory` tool to store verified repo facts in `/memories/repo/`.
- Follow all provided tool schemas exactly, use absolute file paths, prefer large context reads.
- Incorporate repository memories, user preferences (implementation-first progress, iterative audits), and Angular best practices.
- Keep responses focused, use proper Markdown. Prefer implementation over prolonged planning.
- PrimeNG + Angular 21 standalone/signals/OnPush patterns are default for UI work.
