# Copilot Instructions

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
