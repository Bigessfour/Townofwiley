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

**Cursor** reads [`.cursor/mcp.json`](../.cursor/mcp.json) (`mcpServers`). **VS Code / Copilot** reads [`.vscode/mcp.json`](../.vscode/mcp.json) (`servers`). Both register the same Playwright stack:

- **`playwright` / `@playwright/test`** — **1.x** (browser test runner; see `package.json` devDependencies).
- **`@playwright/mcp`** — **0.x** only (exploratory browser MCP). Use `@playwright/mcp@latest` or the repo pin (`^0.0.75`). **Do not** pin `@playwright/mcp@1.59.x` — that version does not exist on npm (`ETARGET`).

Turn on **MCP**, reload the window, and confirm: **angular-cli**, **primeng**, **microsoft/playwright-mcp**, **playwright-test**.

| Server                         | When to use it                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`playwright-test`**          | **Pre-push / CI parity** — `test_run`, `test_list`, planner/generator/healer. Runs against [`playwright.config.ts`](../playwright.config.ts).         |
| **`microsoft/playwright-mcp`** | **Ad-hoc browsing** — explore staging, click flows, mock APIs. Uses [`playwright-mcp.config.json`](../playwright-mcp.config.json). Not a test runner. |
| `angular-cli`, `primeng`       | Framework docs and scaffolding.                                                                                                                       |

**MCP `test_run` example** (same scope as CI smoke):

- `locations`: `["e2e/specs/smoke"]`
- `projects`: `["desktop-chromium"]`

**Node.js:** MCP and `test_run` need **Node 24.15+** (see [`.nvmrc`](../.nvmrc)). Agent terminals may use the IDE’s bundled Node — set **`E2E_NODE`** to your NVM/Homebrew Node 24 binary ([`.vscode/settings.json`](../.vscode/settings.json) sets `E2E_NODE` on macOS and `NVM_SYMLINK` on Windows when nvm-windows is active).

Refresh upstream agent templates after Playwright upgrades:

```bash
npm run e2e:init-agents
```

In **GitHub Copilot** agent settings, paste the `playwright-test` block from `.cursor/mcp.json` if MCP is configured in the GitHub UI.

CI installs browsers for Copilot agent jobs via [`.github/workflows/copilot-setup-steps.yml`](../.github/workflows/copilot-setup-steps.yml) (`workflow_dispatch` / path-triggered).

### VS Code tasks (CLI alternative to MCP)

Run from **Terminal → Run Task…** ([`.vscode/tasks.json`](../.vscode/tasks.json)):

| Task                                       | Purpose                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| **e2e: install browsers**                  | `npm run test:e2e:install` — required once per machine/upgrade            |
| **e2e: smoke (CI parity)**                 | Same as `npm run test:e2e:smoke` / MCP `test_run` on `e2e/specs/smoke`    |
| **e2e: pre-push (preflight + smoke)**      | Python preflight then smoke — quick gate before push                      |
| **e2e: serve :4300**                       | Background `ng serve` for MCP exploration                                 |
| **e2e: smoke (reuse running server)**      | Smoke with `E2E_SKIP_WEBSERVER=1` after serve is up                       |
| **e2e: MCP local loop (serve then smoke)** | Compound: serve → reuse-server smoke when Playwright `webServer` is flaky |
| **e2e: init Playwright agents**            | `npm run e2e:init-agents` after `@playwright/test` bumps                  |

Tasks use **`npm`** scripts so they work on Windows and macOS (integrated terminal env supplies `E2E_NODE` / `PLAYWRIGHT_BROWSERS_PATH` where configured).

### Typography and viewability checks

- **axe**: [`e2e/specs/accessibility/home.a11y.spec.ts`](specs/accessibility/home.a11y.spec.ts) runs WCAG-oriented tags plus an explicit `page-has-heading-one` rule for document outline hygiene.
- **Computed styles**: [`e2e/specs/typography/home.typography.spec.ts`](specs/typography/home.typography.spec.ts) asserts fluid hero sizing, heading hierarchy (hero vs “Quick tasks” `h2`), and font stacks (`Fraunces` display vs `Source Sans 3` body) on desktop and mobile projects.

## Test tiers

| Tier | Command | Scope |
| ---- | ------- | ----- |
| **PR smoke** (CI default) | `npm run test:e2e:smoke` | [`smoke-critical`](../e2e/smoke-critical.manifest.mjs) — homepage, CSP, routes, payments, admin, documents, forms |
| **Full smoke** | `npm run test:e2e:smoke:full` | All of `e2e/specs/smoke/` (~32 files) |
| **Live hosting** | `npm run test:e2e:live:production` or `test:e2e:live:staging` | Requires `E2E_BASE_URL` (set by script or env) |
| **Regression** | `npm run test:e2e:regression` | Full smoke + `accessibility/` + `responsive/` + `typography/` |

CI: [`frontend-smoke`](../.github/workflows/git-workflow.yml) runs PR smoke against local `ng serve`. Live checks: [`e2e-live-hosting.yml`](../.github/workflows/e2e-live-hosting.yml). Nightly: [`e2e-regression-nightly.yml`](../.github/workflows/e2e-regression-nightly.yml).

## Commands

```bash
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:smoke              # PR critical tier (Playwright project smoke-critical)
npm run test:e2e:smoke:full           # entire smoke folder
npm run test:e2e:smoke:all-projects  # desktop + mobile (single worker — avoids dev-server churn)
npm run test:e2e:regression
npm run test:e2e:headed
npm run test:e2e:ui
npm run test:e2e:trace   # PLAYWRIGHT_TRACE=on + Node --trace-warnings (full traces per test)
```

Optional **cow embed / easy-peasy embed path** (not part of default smoke): set `TOW_E2E_CHATBOT_EMBED=1` to run [`e2e/specs/smoke/cow-embed-loader.spec.ts`](specs/smoke/cow-embed-loader.spec.ts) (stubs `chat.min.js`, asserts `/cow-video-popup.js` loads without real chat secrets).

```bash
TOW_E2E_CHATBOT_EMBED=1 npm run test:e2e -- e2e/specs/smoke/cow-embed-loader.spec.ts
```

Set `PLAYWRIGHT_TRACE=on` (or `off`) to override default `retain-on-failure` behavior from [`playwright.config.ts`](../playwright.config.ts).

## Local vs Remote Runs

- Local default: starts `ng serve` automatically at `http://127.0.0.1:4300`.
- Override the local port with `E2E_PORT` if you need a different isolated test port.
- Remote deployment: set `E2E_BASE_URL` and run against Amplify.

### Windows / Cursor agent shell

Agent terminals may not inherit [`.vscode/settings.json`](../.vscode/settings.json) `E2E_NODE` / `NVM_SYMLINK`. Run from repo root **before** smoke (do not use `--ignore-scripts` — that skips kill-port and preflight):

```powershell
$env:Path = "C:\nvm4w\nodejs;$env:Path"
$env:E2E_NODE = "C:\nvm4w\nodejs\node.exe"
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.playwright-browsers"
npm run test:e2e:install
npm run test:e2e:preflight
npm run test:e2e:smoke
```

If Playwright `webServer` is flaky, start the dev server manually and reuse it:

```powershell
# Terminal 1
npm run serve:4300
# Terminal 2
$env:E2E_SKIP_WEBSERVER = "1"
npm run test:e2e:smoke
```

PowerShell example (live hosting — not PR smoke):

```powershell
$env:E2E_BASE_URL = 'https://main.d331voxr1fhoir.amplifyapp.com'
npm run test:e2e:live:staging
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
