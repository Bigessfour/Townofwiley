#!/usr/bin/env node
/**
 * Advisory-only check for @playwright/mcp.
 *
 * This package is intentionally NOT a project dependency.
 * It is used exclusively via `npx @playwright/mcp@latest` by IDE agents
 * (Cursor, VS Code, Grok, etc.) as configured in .cursor/mcp.json.
 *
 * See:
 *   - docs/grok-cli.md
 *   - AGENTS.md
 *   - .cursor/mcp.json
 */

console.log(
  '@playwright/mcp is IDE-only (Cursor / VS Code / Grok via npx @playwright/mcp@latest).\n' +
    'It is intentionally NOT installed as a project dependency and will never be present after `npm ci`.\n' +
    'This check is purely advisory and does not block CI or builds.',
);
