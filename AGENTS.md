# Town of Wiley — Grok Build project rules

Official site for [townofwiley.gov](https://townofwiley.gov): Angular 21, PrimeNG, SCSS, AWS (S3 + CloudFront hosting; AppSync/DynamoDB/Lambda backends), bilingual EN/ES. (Amplify Hosting decommissioned June 2026; see README and docs/AWS_INFRASTRUCTURE_SOT.md for current infra.)

## Stack and conventions

- Standalone components, signals (`input` / `output` / `computed` / `inject`), OnPush, native control flow (`@if`, `@for`, `@switch`).
- No `ngClass` / `ngStyle`; use `[class]` and `[style]`. Semantic HTML; WCAG AA.
- Match existing patterns under `src/app/` before adding abstractions. Minimal diffs.
- UI copy is **English + Spanish** where user-facing (see `site-cms-content.ts`, `SiteLanguageService`).

## CMS Architecture & Gotchas

Headless CMS: **AWS AppSync (GraphQL)** on Gen 1 production API `j7b2x3sh7rcezekekkxxiak7hi`. **Staff day-to-day edits:** `/admin` in-app forms (Cognito). **IT fallback:** AppSync Queries console under **Advanced (IT)**. Amplify Studio / Data Manager is **deprecated** (June 2026). Gen1 Amplify CLI stack remains until decommission — see [`docs/amplify-gen2-migration-plan.md`](docs/amplify-gen2-migration-plan.md).

### Public vs authenticated read/write

| Surface                          | Read                                                                                       | Write              | Auth                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Public site**                  | `LocalizedCmsContentStore` in [`src/app/site-cms-content.ts`](src/app/site-cms-content.ts) | Never from browser | AppSync **API key** (`x-api-key`) via `HttpClient` POST; config from `window.__TOW_RUNTIME_CONFIG__` / [`public/runtime-config.js`](public/runtime-config.js) |
| **`/admin` clerk hub**           | In-app list/create/update via Amplify `generateClient().graphql()`                         | Same               | **Cognito `userPool`** when signed in; falls back to **`iam`** ([`cms-generic-model-admin.service.ts`](src/app/cms-generic-model-admin.service.ts))           |
| **Amplify Console Data manager** | AWS Console (deprecated June 2026)                                                         | CRUD on models     | **AWS IAM** — use AppSync Queries console or `/admin` in-app forms instead                                                                                    |

**Public-query models (10):** `SiteSettings`, `AlertBanner`, `Announcement`, `Event`, `OfficialContact`, `LeadershipRosterEntry`, `Business`, `PublicDocument`, `ExternalNewsLink`, `SiteCopy`. **`EmailAlias` is staff-only** — must not appear in `PUBLIC_CMS_*` queries ([`docs/CMS-MODEL-ROUTE-MATRIX.md`](docs/CMS-MODEL-ROUTE-MATRIX.md), [`public/cms-inventory.json`](public/cms-inventory.json)).

**PublicDocument scope (2026 simplification):** The public site reads only `sectionId: meeting-documents` rows (agendas and approved minutes on `/meetings`). Other section IDs remain in AppSync but are ignored client-side; residents email **clerk@townofwiley.gov** via `/contact` for other document requests. `/records` redirects to `/contact`; `/documents` redirects to `/meetings`.

**Not CMS:** Pay links, weather, chatbot, etc. come from env / `runtime-config.js` and need **S3 + CloudFront redeploy**, not a Data manager save.

### Client-side caching (critical)

Public content uses **revision-based CDN snapshots** in `LocalizedCmsContentStore`:

1. **Bundled defaults** — hardcoded fallbacks in `site-cms-content.ts`
2. **Build/CDN snapshot** — `/cms-snapshot.json` + `/cms-revision.json` (regenerated at deploy and on each CMS edit via `TownOfWileyCmsChangeNotifier`)
3. **localStorage** — key `tow-cms-snapshot-v1`, **7-day offline TTL** (`CMS_SNAPSHOT_TTL_MS`)
4. **Live AppSync** — **staff preview** (`?preview=1`) and **`/admin` → Refresh from database** only. Public visitors sync from CDN when revision changes (~1 minute after clerk save); tab polls revision every 2 minutes.

`contentSourceState`: `'bundled' | 'loading' | 'live' | 'cached'`.

**Clerk expectation:** Saves are immediate in the database; the public site updates within **about one minute** (not instant). The in-app editor shows an info toast after save.

Verify guards: `npm run verify:public-cms-query`, `npm run verify:runtime-config-cms`.

### Editing workflow

| Task                                                                        | Where                                                                                                                              |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Routine content** (notices, events, contacts, documents, homepage fields) | **`/admin`** task hub → **Edit content** ([`src/app/cms-admin/`](src/app/cms-admin/)) — in-app forms → AppSync GraphQL (Cognito)   |
| **IT bulk GraphQL / troubleshooting**                                       | **Advanced (IT)** on `/admin` → **Open content editor** (AppSync Queries console `j7b2…`) — AWS IAM login, not Town staff password |
| **Guided clerk tasks**                                                      | [`src/app/cms-admin/`](src/app/cms-admin/) — task hub → task guide → in-app record editor                                          |
| **Uploads** (hero image, newsletter PDF, meeting docs)                      | `cms-clerk-upload-panel`, `cms-meeting-document-upload` → `CmsPublicDocumentAdminService` / `DocumentUploadService`                |
| **Connection / inventory**                                                  | `cms-site-status`, `cms-content-snapshot`, **Test CMS Connection**                                                                 |

No publish step for CMS rows: save in the in-app editor → public site picks up on the next page load’s live AppSync fetch (typically within seconds). Clerk UI is **English-only**; public site stays **bilingual** — fill `*Es` fields when present.

Stable IDs: `OfficialContact` ids `town-information`, `city-clerk`, `town-superintendent`; `LeadershipRosterEntry.groupId` `mayor-council` (elected officials at `/contact#leadership`), `town-administration` (roster lines in Town Administration card) ([`docs/CMS-MODEL-ROUTE-MATRIX.md`](docs/CMS-MODEL-ROUTE-MATRIX.md)).

### Clerk admin code (current state)

- **Shell:** [`cms-admin.ts`](src/app/cms-admin/cms-admin.ts) at route `/admin`
- **Task hub:** [`cms-clerk-task-hub.component.ts`](src/app/cms-admin/cms-clerk-task-hub.component.ts) — 10 tasks from [`cms-clerk-tasks.ts`](src/app/cms-admin/cms-clerk-tasks.ts) (`post-notice`, `add-meeting`, `homepage`, `update-contacts`, `update-leadership`, `business-directory`, `external-news`, `emergency-banner`, `edit-site-copy`, `manage-email-aliases`)
- **Record editor:** [`cms-clerk-record-editor.component.ts`](src/app/cms-admin/cms-clerk-record-editor.component.ts) — dynamic forms from [`cms-clerk-task-form-fields.ts`](src/app/cms-admin/cms-clerk-task-form-fields.ts)
- **Generic CRUD:** [`CmsGenericModelAdminService`](src/app/cms-generic-model-admin.service.ts) — `listRecords`, `createModel`, `updateModel` for all 10 public models via [`cms-model-admin-fields.ts`](src/app/cms-admin/cms-model-admin-fields.ts); list failures return `[]` (warn), mutations throw
- **Exceptions:** `CmsSiteSettingsAdminService` for `SiteSettings`; `CmsPublicDocumentAdminService` for document upload flows; legacy per-model admin services (`cms-announcement-admin`, etc.) are create-only and largely superseded
- **Auth gate:** `StaffAuthService.isStaff()` required before saves; sign in at `/admin/login`

### Amplify Gen1 compatibility

- **Do not** add Gen2-only breaking schema changes without a migration plan.
- **Do not** add `EmailAlias` (or any staff-only model) to public queries.
- Gen1 CloudFormation stack still exists until decommission — see [`docs/amplify-gen2-migration-plan.md`](docs/amplify-gen2-migration-plan.md).
- Full clerk + IT runbooks: [`docs/CLERK-CMS-GUIDE.md`](docs/CLERK-CMS-GUIDE.md), [`docs/CMS-STUDIO-OPERATIONS-CHECKLIST.md`](docs/CMS-STUDIO-OPERATIONS-CHECKLIST.md), [`docs/CMS-VERIFY-STUDIO.md`](docs/CMS-VERIFY-STUDIO.md).

## Node and tooling

- **Node 24.x only** (pinned in `.nvmrc`; see `docs/NODE_VERSION.md`). On macOS agents: `PATH="/opt/homebrew/opt/node@24/bin:$PATH"`.
- Format/lint: `trunk fmt --all` then `trunk check --fix`; resolve remaining issues manually.
- Build/test: `npm run lint`, `npm run build`, `npm run test:unit:browser`, `npm run test:e2e:smoke`.
- **Pipeline commands (CI/CD, secrets, deploy):** [`docs/pipeline-workflow.md`](docs/pipeline-workflow.md) and [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

## Codebase RAG (local retrieval) — MANDATORY before code changes

**Hard rule for every agent turn in this workspace:**

You **must** retrieve relevant context from the RAG system **before** reading files for edit purposes or making **any** code changes, refactors, new features, CMS updates, or copy modifications.

**Required sequence:**

1. Run a targeted RAG query (MCP `townofwiley-rag` `search_codebase` or `npm run rag:query -- "precise question about the code area"`) for the feature, component, pattern, or content you intend to touch.
2. Review the top results (with their `path:line` citations).
3. Read only the specific cited ranges.
4. Only after incorporating that context may you plan or apply edits.

This guarantees you operate with the freshest semantic picture of the current codebase (src, docs, instructions, skills, existing CMS patterns, etc.) instead of relying on stale training data or partial greps.

See full details and setup in [`docs/codebase-rag.md`](docs/codebase-rag.md) and the corresponding section in [`.github/copilot-instructions.md`](.github/copilot-instructions.md).

- Re-index (prefer incremental) when the index is stale per `npm run rag:status`.
- Use RAG before wide `grep` for exploration.
- Exact symbol lookups can use grep _after_ the RAG step.

## Codebase RAG (local retrieval) — quick reference

- Setup: `npm run rag:setup` then `npm run rag:index` (see [`docs/codebase-rag.md`](docs/codebase-rag.md)).
- Search: MCP **`townofwiley-rag`** → `search_codebase`, or `npm run rag:query -- "<question>"`.
- Use **before** any code inspection for modification or any edit. Generation stays with the IDE model.

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

- CMS model→route matrix, clerk guide, Studio ops: [`docs/CMS-MODEL-ROUTE-MATRIX.md`](docs/CMS-MODEL-ROUTE-MATRIX.md), [`docs/CLERK-CMS-GUIDE.md`](docs/CLERK-CMS-GUIDE.md), [`docs/CMS-STUDIO-OPERATIONS-CHECKLIST.md`](docs/CMS-STUDIO-OPERATIONS-CHECKLIST.md), [`docs/CMS-VERIFY-STUDIO.md`](docs/CMS-VERIFY-STUDIO.md).
- [`.instructions.md`](.instructions.md) — workspace AI instructions.
- [`.cursor/rules/core-workflow.mdc`](.cursor/rules/core-workflow.mdc) — mandatory workflow.
- [`.github/skills/TownOfWiley-Dev/SKILL.md`](.github/skills/TownOfWiley-Dev/SKILL.md) — finishing/polish skill.
- [`.github/instructions/playwright-testing.instructions.md`](.github/instructions/playwright-testing.instructions.md) — e2e standards.

## AWS and secrets

- **Canonical identity:** [`infrastructure/town-aws-account.json`](infrastructure/town-aws-account.json) — account **`570912405222`** only (starts with **57**); IAM user **`copilot`** for agent/IDE CLI access; profile **`townofwiley`**; region **`us-east-2`**. Policies: [`infrastructure/iam/`](infrastructure/iam/) (`copilot-*`). Agents: [`.cursor/rules/aws-account.mdc`](.cursor/rules/aws-account.mdc). Other AWS accounts on your machine are **not** this repo.
- Never commit credentials; use `npm run secrets:*` scripts.
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
