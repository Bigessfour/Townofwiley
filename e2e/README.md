# E2E Test Project

This project uses Playwright to validate the Town of Wiley website end to end.

## Goals

- Keep smoke coverage for every deploy.
- Verify accessibility on critical resident-facing pages.
- Support desktop and mobile test projects from one config.
- Make future pages easy to add through page objects, shared fixtures, and content fixtures.

## Structure

```text
e2e/
  fixtures/
    town.fixture.ts
  pages/
    home.page.ts
  specs/
    accessibility/
    responsive/
    smoke/
    typography/
    seed.spec.ts
  support/
    site-content.ts
specs/
  README.md (markdown plans from the planner MCP agent)
```

## Playwright CLI agents and MCP

Run `npx playwright init-agents --loop copilot -c playwright.config.ts --prompts` after upgrading Playwright to refresh upstream templates. That command wires:

- `.github/agents/playwright-test-{planner,generator,healer}.agent.md` — Copilot agents that drive the browser via the **`playwright-test`** MCP server (`npx playwright run-test-mcp-server`).
- `.github/prompts/playwright-test-*.prompt.md` — starter prompts for plan / generate / heal / coverage flows.
- [`specs/`](../specs/) — default drop folder for planner-produced Markdown plans (`planner_save_plan`).
- [`e2e/specs/seed.spec.ts`](specs/seed.spec.ts) — tiny passing seed the generator can extend.

**Repo-authored agents** under [`.github/agents/`](../.github/agents/) (`playwright-planner`, `playwright-writer`, `playwright-healer`) stay focused on this codebase: read/search-first planning, minimal churn, and Cursor-friendly constraints. Use **`playwright-test-*`** when you want the official MCP-driven explore → plan → codegen loop; use **`playwright-{planner,writer,healer}`** for repository-native reviews without browser MCP.

### MCP in VS Code / Cursor

**Cursor** lists servers from [`.cursor/mcp.json`](../.cursor/mcp.json) at the repo root (or `~/.cursor/mcp.json` globally). It uses the top-level key **`mcpServers`**. If Settings showed no servers, you were looking at the wrong file: Playwright’s `init-agents` merges into [`.vscode/mcp.json`](../.vscode/mcp.json) (VS Code / Copilot style, key **`servers`**). This project keeps both in sync for Cursor + other tools.

Turn on **MCP** in Cursor, then **reload the window** so `.cursor/mcp.json` is picked up. You should see **angular-cli**, **primeng**, **microsoft/playwright-mcp**, and **playwright-test**.

Refresh upstream agent templates after Playwright upgrades:

```bash
npm run e2e:init-agents
```

[`../.vscode/mcp.json`](../.vscode/mcp.json) (VS Code / `init-agents` merge target) and [`../.cursor/mcp.json`](../.cursor/mcp.json) (Cursor UI) register the same tools:

| Server                     | Purpose                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `playwright-test`          | Playwright Test MCP (`run-test-mcp-server`) used by `playwright-test-*` agents — snapshots, planner/generator/healer tools.      |
| `microsoft/playwright-mcp` | Microsoft’s Playwright MCP package (`@playwright/mcp`), useful for general browser automation alongside Angular/PrimeNG servers. |
| `angular-cli`, `primeng`   | Framework docs and scaffolding helpers.                                                                                          |

In **GitHub Copilot** coding agent settings, paste the same `playwright-test` server block if MCP is configured in the GitHub UI rather than locally.

CI installs browsers for Copilot agent jobs via [`.github/workflows/copilot-setup-steps.yml`](../.github/workflows/copilot-setup-steps.yml) (`workflow_dispatch` / path-triggered).

### Typography and viewability checks

- **axe**: [`e2e/specs/accessibility/home.a11y.spec.ts`](specs/accessibility/home.a11y.spec.ts) runs WCAG-oriented tags plus an explicit `page-has-heading-one` rule for document outline hygiene.
- **Computed styles**: [`e2e/specs/typography/home.typography.spec.ts`](specs/typography/home.typography.spec.ts) asserts fluid hero sizing, heading hierarchy (hero vs “Quick tasks” `h2`), and font stacks (`Fraunces` display vs `Source Sans 3` body) on desktop and mobile projects.

## Commands

```bash
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:smoke:all-projects  # desktop + mobile (single worker — avoids dev-server churn)
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:trace   # PLAYWRIGHT_TRACE=on + Node --trace-warnings (full traces per test)
```

Set `PLAYWRIGHT_TRACE=on` (or `off`) to override default `retain-on-failure` behavior from [`playwright.config.ts`](../playwright.config.ts).

## Local vs Remote Runs

- Local default: starts `ng serve` automatically at `http://127.0.0.1:4300`.
- Override the local port with `E2E_PORT` if you need a different isolated test port.
- Remote deployment: set `E2E_BASE_URL` and run against Amplify.

PowerShell example:

```powershell
$env:E2E_BASE_URL = 'https://main.d331voxr1fhoir.amplifyapp.com'
npm run test:e2e:smoke
```

## Expansion Plan

- Add page objects for payments, meetings, records, permits, and contact flows.
- Add API-backed test data when real services are connected.
- Add visual regression checks for high-value templates once branding stabilizes.
- Add authenticated admin or clerk workflows in a separate fixture tree if a CMS or service portal is introduced.
- Add contract tests around forms, notifications, and external payment redirects when those integrations go live.

## Recommended Coverage Layers

- Smoke: homepage, core links, no broken critical UI.
- Accessibility: axe checks on every public template (WCAG-oriented tags + heading-one outline rule).
- Typography: computed-style checks for hero fluid type, hierarchy, and font stacks (`typography/` specs).
- Workflows: payments, issue reporting, records requests, permit requests.
- Responsive: mobile and desktop task completion.
- Content integrity: notices, meetings, and emergency messaging visibility.
