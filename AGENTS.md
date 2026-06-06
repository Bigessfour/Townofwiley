# Town of Wiley — Grok Build project rules

Official site for [townofwiley.gov](https://townofwiley.gov): Angular 21, PrimeNG, SCSS, AWS (S3 + CloudFront hosting; AppSync/DynamoDB/Lambda backends), bilingual EN/ES. (Amplify Hosting decommissioned June 2026; see README and docs/AWS_INFRASTRUCTURE_SOT.md for current infra.)

## Stack and conventions

- Standalone components, signals (`input` / `output` / `computed` / `inject`), OnPush, native control flow (`@if`, `@for`, `@switch`).
- No `ngClass` / `ngStyle`; use `[class]` and `[style]`. Semantic HTML; WCAG AA.
- Match existing patterns under `src/app/` before adding abstractions. Minimal diffs.
- UI copy is **English + Spanish** where user-facing (see `site-cms-content.ts`, `SiteLanguageService`).

## Node and tooling

- **Node 24.x only** (pinned in `.nvmrc`; see `docs/NODE_VERSION.md`). On macOS agents: `PATH="/opt/homebrew/opt/node@24/bin:$PATH"`.
- Format/lint: `trunk fmt --all` then `trunk check --fix`; resolve remaining issues manually.
- Build/test: `npm run lint`, `npm run build`, `npm run test:unit:browser`, `npm run test:e2e:smoke`.
- **Pipeline commands (CI/CD, secrets, deploy):** [`docs/pipeline-workflow.md`](docs/pipeline-workflow.md) and [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

## Codebase RAG (local retrieval)

- Setup: `npm run rag:setup` then `npm run rag:index` (see [`docs/codebase-rag.md`](docs/codebase-rag.md)).
- Search: MCP **`townofwiley-rag`** → `search_codebase`, or `npm run rag:query -- "<question>"`.
- Use before wide grep when exploring; generation stays with the IDE model.

## MCP (prefer before guessing)

Project MCP is in [`.grok/config.toml`](.grok/config.toml) (mirrors [`.cursor/mcp.json`](.cursor/mcp.json)):

- **angular-cli** — Angular 21 patterns, `list_projects`, `get_best_practices`.
- **primeng** — PrimeNG component usage (Cursor); run `npm run mcp:primeng:install` once — pinned SDK in [`mcp/primeng/`](mcp/primeng/) — see [`docs/grok-cli.md`](docs/grok-cli.md).
- **playwright-test** — run/fix e2e via `run-test-mcp-server`.
- **playwright-mcp** — exploratory browser automation (`@playwright/mcp@latest`).
- **figma** — design-to-code when given Figma URLs; follow [`.cursor/rules/figma-mcp.mdc`](.cursor/rules/figma-mcp.mdc).
- **townofwiley-rag** — local codebase semantic search (`search_codebase`, `rag_status`). The index covers `src/`, docs, e2e, scripts, infrastructure, `rag/tow_rag/` (self-description), `.github/skills/`, and all agent instruction files. Use before wide grep.

## Cursor IDE Chat (Composer / Agent) Auto-Approval

See the **"Cursor Agent Auto-Approval & Execution Policy"** section in [`.cursor/rules/core-workflow.mdc`](.cursor/rules/core-workflow.mdc).

This is the source of truth for when the agent may auto-approve edits and terminal commands. The policy is enforced both by instructions and by an active project hook at `.cursor/hooks/pre_tool_use.py`.

Key points:

- Routine dev work (edits following the rules, safe npm/trunks commands) → auto-approve is expected.
- Destructive, mutating, or production-impacting actions → must ask.
- A terminal hook auto-allows only safe read-only HTTP diagnostics (`curl` / Invoke-WebRequest with no body) and forces confirmation on anything else.

## Grok CLI (Heavy only)

Use [Grok Build](https://x.ai/cli) with **OAuth + `grok-build`** (SuperGrok / X Premium+). **Never** set `XAI_API_KEY` in the shell — it overrides OAuth. Full reference: [`docs/grok-cli.md`](docs/grok-cli.md). Cursor agents: [`.cursor/rules/grok-cli.mdc`](.cursor/rules/grok-cli.mdc).

**Shell (required in agent/Cursor terminals):**

```bash
export PATH="$HOME/.grok/bin:$PATH"
source ~/.zshrc
```

**Health check:**

```bash
grok --version && grok models && grok -p "reply with exactly: ok" && grok mcp doctor
```

**Canonical usage:**

| Task                    | Command                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| Interactive             | `grok`                                                                     |
| Headless                | `grok -p "prompt"`                                                         |
| Auto-approve (headless) | `grok -p "prompt" --yolo` — **not** `-yolo` or `-y`                        |
| CI logs                 | `gh run view <id> --log-failed` — **not** `grok -p "fetch github.com/..."` |

`Auth(AuthorizationRequired)` in logs while `-p` still returns text is a known headless worker quirk; refresh with `grok login --oauth` or use interactive `grok`.

## Deeper references

- [`.instructions.md`](.instructions.md) — workspace AI instructions.
- [`.cursor/rules/core-workflow.mdc`](.cursor/rules/core-workflow.mdc) — mandatory workflow.
- [`.github/skills/TownOfWiley-Dev/SKILL.md`](.github/skills/TownOfWiley-Dev/SKILL.md) — finishing/polish skill.
- [`.github/instructions/playwright-testing.instructions.md`](.github/instructions/playwright-testing.instructions.md) — e2e standards.

## AWS and secrets

- AWS account **570912405222**; profile **`townofwiley`**. Never commit credentials; use `npm run secrets:*` scripts.
- **For agent access (Grok, Cursor, etc.):** Source the helper before working with AWS:
  ```bash
  source scripts/agent-aws-env.sh
  ```
  This exports `AWS_PROFILE=townofwiley` and `AWS_DEFAULT_REGION=us-east-2` so the agent can run `aws` commands directly.
- First-time setup (or when credentials expire):
  ```bash
  npm run aws:configure-profile
  ```
  Or prefer modern SSO:
  ```bash
  aws configure sso --profile townofwiley
  aws sso login --profile townofwiley
  ```
- Always verify with: `aws sts get-caller-identity`
- Cost optimization: [`docs/aws-cost-optimization-runbook.md`](docs/aws-cost-optimization-runbook.md) — `npm run aws:optimize:discover` / `aws:optimize:apply`
- See also: `scripts/configure-aws-cli-profile.sh`, `scripts/agent-aws-env.sh`, and `infrastructure/aws-infrastructure.manifest.json` (Single Source of Truth).

## Git

- Feature branches; **never push directly to `main`** — open a PR and wait for **`site-ci / CI gate (merge required)`** to pass before merge.
- Merge to `main` when CI is green. Do not force-push `main`.
- Branch protection setup: [`docs/github-branch-protection.md`](docs/github-branch-protection.md).
