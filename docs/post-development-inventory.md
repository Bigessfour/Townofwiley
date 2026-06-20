# Post-Development Inventory — Town of Wiley

**Generated:** 2026-05-22 · **Last updated:** 2026-05-23 (AP-05 contact Lambdas deployed + Amplify wired; deploy-script hardening; AP-07a/b in repo)
**Purpose:** Map what exists in this repo after a whole-product build, then guide review and next actions.
**Doc index:** [docs/README.md](./README.md)
**Related:** [e2e-feature-map.md](./e2e-feature-map.md), [NODE_VERSION.md](./NODE_VERSION.md), [incomplete-items-reference.md](./incomplete-items-reference.md), [feature-completion-spec.md](./feature-completion-spec.md), [review-checklist.md](./review-checklist.md), [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)

**Product identity:** Primary deliverable is **townofwiley.gov** (Angular municipal site). **“Wiley Widget”** in-repo means the resident assistant UX: **Ask Wiley** (`LocalizedAiChat`), optional **Easy Peasy** embed (`public/easy-peasy-loader.js`), and the **cow welcome popup** (`public/cow-video-popup.js`). There is no separate npm package named “Wiley Widget.”

---

## Executive summary

| Area                         | Status in repo                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public SPA + prerender       | Shipped — routes, bilingual UI, smoke E2E                                                                        |
| CMS (AppSync + S3)           | Shipped — read via API key; staff workflows via Studio + `/admin`                                                |
| Weather + alert signup       | Shipped — NWS proxy + large Python signup backend                                                                |
| Paystar / bill pay           | AP-03 + AP-02a/c **on `main`** (PR #34); ops: `portalUrl` + formal Path A sign-off                               |
| Contact update backends      | **Deployed** — write + IAM review + review proxy Lambdas; Amplify `main` env wired (Amplify job **202** SUCCEED) |
| Node.js toolchain            | Pin **24.16.0** on `main` (`.nvmrc`, Amplify, GHA); reconcile live Amplify buildSpec if still **24.15.0**        |
| AWS IaC / drift checks       | **Added** — manifests + `npm run verify:aws-infra` (see § Recent accomplishments)                                |
| Budget import / calculations | **Not present** — guides + search only                                                                           |
| Online permits               | **Not present** — informational page only                                                                        |
| Bill pay persistence API     | **Not present** — mailto or optional HTTP POST                                                                   |
| Monolithic homepage          | `app.ts` ~3,000 lines — maintainability risk                                                                     |

---

## Recent accomplishments (2026-05-22 – 2026-05-23)

| Work                                            | Status                                                              | Where                                                                                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AP-03 Paystar placeholder CTA                   | **Merged** [#30](https://github.com/Bigessfour/Townofwiley/pull/30) | `main`                                                                                                                                                                                                                                           |
| AP-02a/c, AP-24a Paystar docs/E2E; Node 24.16.0 | **Merged** [#34](https://github.com/Bigessfour/Townofwiley/pull/34) | `main`                                                                                                                                                                                                                                           |
| AP-06 contact sanitization + IaC SSOT           | **Merged** [#35](https://github.com/Bigessfour/Townofwiley/pull/35) | `main`                                                                                                                                                                                                                                           |
| **AP-05** contact Lambdas + Amplify wiring      | **Done** (2026-05-23)                                               | `TownOfWileyContactUpdate` (NONE), `TownOfWileyContactUpdatesReview` (**AWS_IAM**), `TownOfWileyContactUpdatesReviewProxy`; Amplify `CONTACT_UPDATE_API_ENDPOINT` + `CONTACT_UPDATE_REVIEW_PROXY_URL`; prod `runtime-config.js` contact keys set |
| Deploy-script hardening (Windows)               | **In working tree**                                                 | `scripts/_deploy_npm.py`, CORS `AllowMethods` fix, `@smithy/signature-v4`, proxy env (no `AWS_REGION`), `scripts/e2e-web-server.mjs`                                                                                                             |
| Amplify hosting sync (CSP both S3 hostnames)    | **Done** (live account)                                             | `amplify:sync-hosting`, `customHttp.yml`, [`third-party-csp-registry.md`](./third-party-csp-registry.md)                                                                                                                                         |
| DynamoDB `TownOfWileyContactUpdates`            | **ACTIVE**                                                          | `us-east-2`                                                                                                                                                                                                                                      |
| IaC SSOT + verification                         | **On `main`**                                                       | `aws-infrastructure.manifest.json`, `verify:aws-infra`, [AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md)                                                                                                                                 |
| AWS resource analysis vs docs                   | **Documented**                                                      | § AWS live configuration, [AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md)                                                                                                                                                               |

**AP-05 evidence (ops, 2026-05-23):** `aws lambda get-function-url-config --function-name TownOfWileyContactUpdatesReview --query AuthType` → **AWS_IAM**. Amplify branch `main` job **202** SUCCEED. `npm run verify:aws-infra` → **28 OK**, 1 warning (optional Paystar proxy), 1 failure (live buildSpec Node pin — run `npm run amplify:sync-buildspec`).

---

## Next iteration plan

### Suggested work order (post-AP-05)

1. **AP-01b** — prod `/runtime-config.js` full audit vs Amplify branch env ([amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json)).
2. **AP-07c** — E2E: admin contact tab shows error banner on mocked review failure (AP-07a/b **Done in repo**).
3. **Ops:** `npm run amplify:sync-buildspec` (live buildSpec **24.16.0**); **AP-10** (`PAYSTAR_PORTAL_URL`); **AP-16** (WAF); **AP-19** (AppSync key before **2026-06-22**).
4. Commit deploy-script + E2E webServer fixes on a feature branch.

**CI baseline per slice:** `npm run lint` → `npm run test:vitest` → `npm run test:infra` (if `infrastructure/` touched) → `npm run verify:aws-infra` (ops) → `npm run test:e2e:smoke` when routes change.

---

## 1. High-level architecture

### Main folders

| Path                   | Role                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `src/`                 | Angular 21 app (`townofwiley-app`)                                                                |
| `public/`              | Static assets, generated `runtime-config.js`, document archive HTML, chat loaders                 |
| `amplify/`             | AppSync GraphQL, Cognito, S3 `documents`                                                          |
| `infrastructure/`      | Lambdas/proxies (NWS, Paystar, weather signup, contact updates, chat, email router, site monitor) |
| `scripts/`             | Runtime config, deploy, CSP/header sync, secrets CLI                                              |
| `e2e/`                 | Playwright smoke + responsive + a11y                                                              |
| `docs/`                | Runbooks and checklists (this file)                                                               |
| `archive/hello-world/` | Web codegen scorer only — **not production** (see `archive/README.md`)                            |
| `bot-training/`        | Ask Wiley knowledge model (content, not runtime)                                                  |

### Tech stack

- **Frontend:** Angular 21, standalone + signals + OnPush, PrimeNG 21, Tailwind 4
- **Hosting:** S3 `townofwiley-static-site` + CloudFront `E1NZ3XCY5CYR1J` (`d34qrz3qxoppc5.cloudfront.net`) → `townofwiley.gov` (account `570912405222`; Amplify Hosting app `d331voxr1fhoir` deleted June 2026 after migration; Node **24.16.0** pin remains for builds/CI)
- **CMS:** Gen 1 AppSync `townofwiley-main` (`j7b2x3sh7rcezekekkxxiak7hi`) + DynamoDB + S3 `townofwiley-documents-storage-main`. SSOT: [gen1-production-bindings.json](../infrastructure/gen1-production-bindings.json). Gen 2 retired — [gen2-decommissioned.md](./gen2-decommissioned.md).
- **Config:** `scripts/generate-runtime-config.mjs` → `public/runtime-config.js` (Amplify `main` branch env vars)
- **Tests:** Vitest, `ng test`, Playwright smoke, Node `test:infra`

### AWS live configuration (verified 2026-05-22)

Cross-checked against [AWS documentation](https://docs.aws.amazon.com/) (Lambda Function URL auth, AppSync API keys, Amplify custom headers, S3 Block Public Access) and live account **`570912405222`** via AWS CLI/MCP.

| Area                       | Resource / setting                                                                                              | Live status                                                                                                            | Repo / ops alignment                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hosting (S3+CF)**        | S3 `townofwiley-static-site` + CloudFront `E1NZ3XCY5CYR1J` (`d34qrz3qxoppc5...`); aliases townofwiley.gov + www | Production via manual/CI `s3 sync` + invalidation; domain **AVAILABLE**; old Amplify app `d331voxr1fhoir` **DELETED**  | `customHttp.yml` for dev CSP parity; deploy: `aws s3 sync ... && aws cloudfront create-invalidation ...`; see README + AWS_INFRASTRUCTURE_SOT.md  |
| **HTTP headers / CSP**     | CloudFront + `customHttp.yml` origins                                                                           | **Current** — CSP includes document bucket + external services                                                         | `npm run sync:angular-serve-csp` for local; CloudFront config for prod (historical Amplify sync scripts obsolete)                                 |
| **AppSync CMS**            | `townofwiley-main`                                                                                              | Default auth **API_KEY**; key expires **2026-06-22**                                                                   | [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md) + EventBridge reminder — **AP-19**                                   |
| **S3 documents**           | `townofwiley-documents-storage-main`                                                                            | **Block Public Access** — all four settings **on**                                                                     | CSP + Amplify Storage; **AP-17** AV/metadata policy still open                                                                                    |
| **S3 email alias**         | `townofwiley-email-alias-570912405222-us-east-1`                                                                | **Block Public Access** — all four settings **on**                                                                     | `scripts/deploy-email-alias-router.py`                                                                                                            |
| **Lambda (public `NONE`)** | `TownOfWileyNWSWeatherProxy`, `TownOfWileySevereWeatherBackend`, `townofwiley-easy-peasy-chat-proxy`            | Function URLs **NONE** + CORS to `townofwiley.gov` / Amplify host                                                      | Acceptable for public proxies per [Lambda URL auth](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html); add **WAF rate limits — AP-16** |
| **Lambda (contact)**       | `TownOfWileyContactUpdate`, `TownOfWileyContactUpdatesReview`, `TownOfWileyContactUpdatesReviewProxy`           | **Deployed** 2026-05-23 — review URL **AWS_IAM**; proxy + write **NONE**; Amplify env + prod `runtime-config.js` wired | **AP-16** WAF on public URLs; manual clerk smoke on `/admin#updates`                                                                              |
| **Lambda (Paystar)**       | `TownOfWileyPaystarProxy` (expected)                                                                            | **Not present** in `us-east-2` function list                                                                           | Hosted Paystar via env URL — **AP-10**                                                                                                            |
| **Paystar / runtime**      | Amplify `main` env                                                                                              | NWS, severe-weather, Easy Peasy endpoints set; Paystar portal URL ops-owned                                            | **AP-01b** verify `/runtime-config.js` on prod                                                                                                    |

**IaC SSOT:** [docs/AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md), [infrastructure/aws-infrastructure.manifest.json](../infrastructure/aws-infrastructure.manifest.json), [infrastructure/amplify-branch-env.manifest.json](../infrastructure/amplify-branch-env.manifest.json). Verify: `npm run verify:aws-infra`.

**Sync commands (Wiley account, `us-east-2`):** `npm run amplify:sync-hosting` (buildSpec + headers + SPA rules). Requires local `aws` CLI profile or equivalent credentials for `570912405222`.

**Post-sync:** Redeploy Amplify `main` so the next build uses Node **24.16.0**; hard-refresh browsers after header changes.

---

## 2. Major functional areas

### Public routes (`src/app/app.routes.ts`)

| Route                                              | Component / area                                             |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `/`                                                | `App` (homepage shell)                                       |
| `/weather`                                         | `LocalizedWeatherPanel`                                      |
| `/services`                                        | `ResidentServices` (payment, issue, records, weather panels) |
| `/pay-bill`, `/payments`                           | `PayBillPageComponent`                                       |
| `/documents`                                       | `DocumentHub`                                                |
| `/records`                                         | `RecordsCenter`                                              |
| `/meetings`, `/notices`, `/news`                   | Page components + CMS                                        |
| `/businesses`                                      | `BusinessDirectory`                                          |
| `/permits`                                         | Info only — clerk office, no online workflow                 |
| `/contact`, `/accessibility`, `/privacy`, `/terms` | Legal / contact pages                                        |
| `/admin`                                           | `CmsAdmin` + document upload + contact-update review         |
| `/clerk-setup`                                     | Redirect to admin workflow                                   |

**Prerendered** (`app.routes.server.ts`): public routes above except `/admin` and `/clerk-setup`.

### CMS (GraphQL models)

`SiteSettings`, `AlertBanner`, `Announcement`, `Event`, `OfficialContact`, `EmailAlias` (staff auth), `Business`, `PublicDocument`, `ExternalNewsLink` — see `amplify/backend/api/townofwiley/schema.graphql`.

### Documents & records

- **CMS-only hub:** active `PublicDocument` rows via AppSync (`LocalizedCmsContentStore`); optional `titleEs` / `summaryEs` / `statusEs`
- Legacy HTML guides: `public/documents/archive/` (href targets; not a separate manifest)
- Staff publishing: Amplify Studio **PublicDocument** — see `docs/CLERK-CMS-GUIDE.md`
- Upload resolution: `DocumentUploadService` + `CmsPublicDocumentAdminService` (storage-backed `href`)
- **No** budget import, spreadsheet parsing, or fiscal calculation engine

### Weather & alerts

- UI: `LocalizedWeatherPanel`, `HomepageWeatherAlertPrimer`, `WeatherAlertBannerComponent`
- Proxies/backends: `infrastructure/nws-weather-proxy/`, `infrastructure/severe-weather-signup/` (large Python app)

### Payments

- `PaystarConnectionService` — `none` | `hosted` | `api`; offline queue in `localStorage`
- `BillPayService` — early-access intake; API optional; mailto fallback
- Proxy: `infrastructure/paystar-proxy/` (upstream field mapping still tenant-dependent)

### AI / Wiley Widget

- `LocalizedAiChat`, `chatbot-config.ts`
- `infrastructure/easy-peasy-chat-proxy/`
- `public/easy-peasy-loader.js`, `public/cow-video-popup.js`

### Ops backends (non-resident)

- Email alias router, site monitor — deploy via `scripts/deploy-*.py`

---

## 3. Core business logic (quick reference)

| Unit                                          | Responsibility                                                    |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `App` (`app.ts`)                              | Homepage, search index, calendar, mega-menu, bilingual `APP_COPY` |
| `LocalizedCmsContentStore`                    | AppSync load, fallback content, connection test                   |
| `ResidentServices` + panels                   | Forms, mailto builders, Paystar/contact/bill-pay                  |
| `BillPayService` / `PayBillPageComponent`     | Sanitized bill-pay intake                                         |
| `PaystarConnectionService`                    | Payment launch, offline queue                                     |
| `ContactUpdateService`                        | Billing contact POST + mailto fallback                            |
| `DocumentUploadService` / `DocumentHub`       | S3 + public document hub                                          |
| `meetings-page.helpers.ts`                    | CMS/seed → calendar items                                         |
| `infrastructure/paystar-proxy/index.mjs`      | Server-side Paystar launch                                        |
| `infrastructure/severe-weather-signup/app.py` | Subscriptions, SES/SMS, delivery                                  |

---

## 4. High-risk areas (review focus)

1. **Money:** Paystar launch from browser to public Lambda; amounts in proxy; PCI with Paystar
2. **PII:** Contact updates (Dynamo + SES), severe-weather signup (email/phone), bill-pay early access
3. **Admin data exposure:** `contact-updates-review` Lambda — comments require **AWS_IAM** on Function URL, not public scan
4. **CMS API key:** Public read in runtime config / client (by schema design)
5. **mailto-only flows:** Issues, records, accessibility — no server audit trail
6. **AI chat:** Third-party embed or proxy; prompt content in `bot-training/`
7. **Emergency-adjacent:** Weather proxy fallback vs direct NWS; alert signup production config

---

## 5. Signs of whole-product / incomplete build

- **`app.ts` monolith** (~3,020 lines)
- **Bill pay backend** documented but not implemented in repo
- **Paystar proxy** guessed JSON field names; receipt endpoint returns 501 until configured
- **Mock/test archive HTML** alongside production-style guides
- **Placeholder Paystar URL** when runtime config missing
- **Spanish CMS** via manual translation map, not model fields
- **Cow / Easy Peasy E2E** off by default (`TOW_E2E_CHATBOT_EMBED=1`)
- **`archive/hello-world/`**, **`archive/artifacts/`**, **`.generated/`** not product code (see `archive/README.md`)

---

## Review checklist

Use before calling the site “audit-complete” or merging large refactors. Check evidence (command, screenshot, AWS console) in the **Evidence** column when done.

### A. Production configuration (AWS / runtime)

- [ ] **Strict build** passes on Amplify `main` (all `requiredForProduction` env vars in [`amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json))
- [ ] `public/runtime-config.js` on **production** has correct CMS endpoint/key, NWS proxy, severe-weather signup URL, Paystar mode/URLs
- [ ] Post-deploy: `npm run verify:runtime-config-cms` (`listSiteSettings` OK)
- [ ] AppSync key rotation runbook + EventBridge reminder: [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md)
- [ ] Paystar: confirm live mode (`none` / `hosted` / `api`) matches clerk expectation; no placeholder portal URL in prod _(code fix merged AP-03 — verify on prod after deploy)_
- [ ] Bill pay: if using API, endpoint exists and is authenticated — not mailto-only by accident
- [ ] Contact-update **write** Lambda deployed; staff review uses JWT API (`CONTACT_UPDATE_REVIEW_API_URL`), not public proxy
- [ ] Severe-weather signup Lambda + Dynamo + SES/SNS verified in `us-east-2`
- [ ] Amplify SPA rewrite + `404.html` / static route entrypoints — deep links work on hard refresh
- [ ] Cognito/AppSync/S3 IDs in `amplify-config.ts` match current Amplify backend

### B. Resident-facing flows (manual or E2E)

- [ ] Homepage search finds documents, services, archive guides (EN + ES)
- [ ] `/pay-bill` validation messages and success/failure paths (API and mailto fallback)
- [ ] `/services` payment panel: Paystar hosted or API when enabled
- [ ] `/weather` forecast loads; alert signup + unsubscribe link after signup
- [ ] `/documents` CMS + archive links resolve (including `storage:` keys)
- [ ] `/permits` shows clerk contact; no false promise of online permitting
- [ ] Language toggle on key routes; no blank panels in Spanish

### C. Staff / admin

- [ ] `/admin` CMS connection test succeeds against Studio
- [ ] Document upload → appears in hub / CMS `PublicDocument`
- [ ] Contact updates visible in admin table; CSV export acceptable for clerk workflow
- [ ] [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) matches actual Studio models and `/admin` UI

### D. Security & compliance (see also [review-checklist.md](./review-checklist.md))

- [ ] No secrets in git; `npm run secrets:status` documented for maintainers
- [ ] WAF/throttles on public Lambda URLs (per [feature-completion-spec.md](./feature-completion-spec.md))
- [ ] Upload storage AV/metadata policy (ops)
- [x] API key rotation process for AppSync documented ([appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md))

### E. Automated gates

- [ ] `npm run lint`
- [ ] `npm run test:vitest`
- [ ] `npm run test:infra` (and weather/email pytest if those paths changed)
- [ ] `npm run test:e2e:smoke`
- [ ] Optional: `npm run audit:done:local` before release tag

### F. Content honesty

- [ ] Remove or clearly label **test/MOC** archive HTML if not intended for residents
- [ ] Newsletter PDFs and meeting packets match what clerk published
- [ ] No “early access” / “coming soon” copy left on production without intent

### Runtime config + AppSync completeness (post-deploy / post-rotation)

| #   | Check                               | How                                                                                          |
| --- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Build fails on missing keys         | Clear one `requiredForProduction` Amplify env on a test branch → strict build fails; restore |
| 2   | New key in prod `runtime-config.js` | After rotation, fetch live JS; `cms.appSync.apiKey` non-empty (redact in logs)               |
| 3   | `listSiteSettings` returns data     | `npm run verify:runtime-config-cms`                                                          |
| 4   | Calendar entry visible              | Studio **Event** + `/meetings#calendar` (or E2E `feature-pages.spec.ts`)                     |

---

## Action steps

Prioritized for a volunteer/clerk + developer team. Adjust owners and dates locally.

### P0 — Before trusting production with money or PII

| #   | Action                                                                 | Owner       | Notes                                                                                                                                     |
| --- | ---------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Verify production `runtime-config.js`** on Amplify `main` branch env | DevOps      | Compare to `secrets` / Amplify env vars; document in runbook                                                                              |
| 2   | **Paystar go-live decision**                                           | Clerk + Dev | Set `PAYSTAR_MODE`, portal URL, or upstream launch URL + API key on Lambda; smoke test real (non-mock) launch                             |
| 3   | **Lock down contact-updates-review**                                   | DevOps      | Function URL `AuthType: AWS_IAM`; admin UI must not call a public scan URL                                                                |
| 4   | **Confirm bill-pay path**                                              | Clerk + Dev | Either deploy `POST /api/v1/bill-pay-requests` backend per `bill-pay.service.ts` comment or explicitly accept mailto-only and update copy |
| 5   | **Run smoke on staging**                                               | Dev         | `npm run test:e2e:smoke` against staging host if available                                                                                |

### P1 — Correctness & trust (2–4 weeks)

| #   | Action                                                                                    | Owner  | Notes                                                                                                            |
| --- | ----------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| 6   | **Archive content audit**                                                                 | Clerk  | Replace or remove `test-council-agenda-*`, `mock-approved-minutes-*` if residents might find them                |
| 7   | **Close “Done When” in** [incomplete-items-reference.md](./incomplete-items-reference.md) | Dev    | Section 0 still has open holistic criteria — reconcile with reality                                              |
| 8   | **Paystar proxy mapping**                                                                 | Dev    | Update `mapUpstreamJsonToTownLaunchResponse` when Paystar confirms REST shape; enable receipt template if needed |
| 9   | **Enable chat embed CI**                                                                  | Dev    | Run `TOW_E2E_CHATBOT_EMBED=1` periodically or in nightly workflow                                                |
| 10  | **WAF / rate limits**                                                                     | DevOps | Per feature-completion-spec — public Lambda URLs                                                                 |
| 11  | **Document upload AV**                                                                    | DevOps | S3 upload scanning policy                                                                                        |

### P2 — Maintainability & incremental verification (backlog)

| #   | Action                           | Owner   | Notes                                                                         |
| --- | -------------------------------- | ------- | ----------------------------------------------------------------------------- |
| 12  | **Split `app.ts`**               | Dev     | Extract search, calendar, copy into focused modules without behavior change   |
| 13  | **CMS i18n strategy**            | Product | Language fields in GraphQL vs expanded translation map vs English-only CMS    |
| 14  | **Centralize error logging**     | Dev     | Reduce raw `console.error` in upload/CMS paths; use `LoggingService`          |
| 15  | **Lighthouse staging**           | Dev     | `npm run perf:lighthouse:staging` before major releases                       |
| 16  | **Applitools / visual baseline** | Dev     | Optional gate; artifacts in `archive/artifacts/debug/`                        |
| 17  | **Records/issue tracking**       | Product | If mailto insufficient, spec Dynamo + clerk notification Lambda (new feature) |

### Explicitly out of scope unless requested

- Budget import / municipal calculations
- Online permit/licensing workflow
- Full in-app CMS editor (Amplify Studio remains source of truth)

---

## Validation commands

```bash
npm run lint
npm run test:vitest
npm run test:infra
npm run test:infra:alerts
npm run test:infra:mail
npm run test:e2e:smoke
npm run build
```

Full local gate: `npm run audit:done:local`

---

## Document maintenance

- Update **Generated** date when re-auditing after major merges.
- When an action step ships, move evidence to the relevant runbook (`amplify-deployment-runbook.md`, `CLERK-CMS-GUIDE.md`) and trim this file’s P0/P1 table.
- Do not duplicate full E2E route lists — keep [e2e-feature-map.md](./e2e-feature-map.md) as the integration map.

---

## Phase 2: Test coverage analysis

**Generated:** 2026-05-22 (appended to Phase 1 inventory)
**Scope:** What existing tests actually prove — not line-coverage percentages.

### How tests are organized

| Layer                               | Runner                                                               | Location                                                                                                  | Default CI (`git-workflow.yml`) |
| ----------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Vitest (unit/integration-style)** | `npm run test:vitest`                                                | `src/**/*.vitest.ts` only                                                                                 | Yes, when `src/` changes        |
| **Angular `*.spec.ts`**             | `npm run test:unit:browser` (Karma + Chromium)                       | `src/**/*.spec.ts`                                                                                        | Yes, when `src/` changes        |
| **Node infra**                      | `npm run test:infra`                                                 | `infrastructure/nws-weather-proxy/index.test.mjs`, `infrastructure/paystar-proxy/index.test.mjs`          | When proxy paths change         |
| **Python infra**                    | `npm run test:infra:alerts`, `test:infra:mail`, `test:infra:backend` | `infrastructure/severe-weather-signup/tests/`, `email-alias-router/tests/`, `site-monitor/tests/`         | Path-dependent                  |
| **Playwright smoke**                | `npm run test:e2e:smoke`                                             | `e2e/specs/smoke/*.spec.ts` (~27 files)                                                                   | When app/e2e changes            |
| **Playwright extended**             | Manual / optional                                                    | `e2e/specs/responsive/`, `accessibility/`, `applitools/`, `best-practices/deterministic-coverage.spec.ts` | **Not** default smoke gate      |
| **Opt-in E2E**                      | `TOW_E2E_CHATBOT_EMBED=1`                                            | `e2e/specs/smoke/cow-embed-loader.spec.ts`                                                                | Off in CI                       |

**Important split:** Vitest does **not** run `*.spec.ts`. Many “unit” tests only execute in the browser test job. Treat both as required for frontend confidence.

**Not in default automated proof:**

- `infrastructure/contact-update-lambda/` — no `index.test.mjs`
- `infrastructure/contact-updates-review/` — no tests
- `infrastructure/easy-peasy-chat-proxy/` — no tests in `test:infra`
- **Budget import / calculations** — N/A (no production code)

---

### Overall test confidence (honest)

| Dimension                         | Confidence                               | Why                                                                                                                |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Public UI shell & routing**     | **High**                                 | Broad `app.spec.ts` + smoke route health, megamenu, deep links, bilingual pages                                    |
| **CMS read path & fallbacks**     | **Medium–high**                          | `site-cms-content.spec.ts` proves GraphQL shape + normalization; E2E does not hit real AppSync in CI               |
| **Weather display (NWS)**         | **Medium–high**                          | Vitest on panel + proxy unit tests + homepage E2E with mocks                                                       |
| **Severe-weather signup backend** | **High (backend)** / **Medium (wiring)** | 30+ Python tests on `app.py`; frontend signup tested with mocked HTTP, not live Lambda                             |
| **Paystar / bill pay**            | **Low–medium**                           | Happy-path and error **mocks** only; no real Paystar contract; offline queue untested; bill-pay API backend absent |
| **Contact update write path**     | **Low–medium**                           | Service fallbacks tested; **Lambda and Dynamo not tested** in repo                                                 |
| **Document S3 upload**            | **Low**                                  | Component tests with **stubbed** `DocumentUploadService`; real Amplify Storage untested                            |
| **Admin / clerk review**          | **Low**                                  | E2E checks admin **UI shell**; no test for `ContactUpdateReviewService` or review Lambda                           |
| **AI chat (Ask Wiley)**           | **Medium (API mode)** / **Low (embed)**  | `home.chat.spec.ts` mocks chat API; embed/cow loader opt-in only                                                   |
| **mailto-only forms**             | **Medium**                               | Mailto **string building** in vitest harness; not E2E mail client behavior                                         |
| **Money-adjacent correctness**    | **Low**                                  | No amount/settlement tests; Paystar cents conversion only in proxy code, not integration-tested against vendor     |

**Bottom line:** CI gives **strong confidence the site renders, navigates, and degrades gracefully under mocks**. It does **not** give strong confidence that **production AWS integrations (Paystar, bill-pay API, contact-update Lambdas, S3 uploads, live AppSync)** behave correctly end-to-end.

---

### Coverage by functional area

#### Homepage, search, navigation (`App`)

| Proof       | File(s)                                                                                                                           | What it actually proves                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | —                                                                                                                                 | **No dedicated vitest** for search index / `App` computed logic                                                                                                                                                       |
| `*.spec.ts` | `src/app/app.spec.ts` (24 cases)                                                                                                  | Component creates; EN homepage; mega-menu commands/navigation; CMS events → calendar; Paystar CTA when config hosted; weather proxy vs fallback; alert banner dismiss/refresh; admin/documents routes; lazy route map |
| E2E         | `home.smoke.spec.ts`, `home.navigation.spec.ts`, `home.interactions.spec.ts`, `megamenu-*.spec.ts`, `public-route-health.spec.ts` | User-visible navigation, search to archive, interactions                                                                                                                                                              |

**Gaps:** Sitewide **search index** logic inside `app.ts` (~3k lines) is only indirectly touched (one E2E search case). No isolated tests for search ranking, debounce, or archive crawl merge.

---

#### CMS (`LocalizedCmsContentStore`, GraphQL)

| Proof       | File(s)                                                                        | What it actually proves                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | —                                                                              | —                                                                                                                                                                           |
| `*.spec.ts` | `src/app/site-cms-content.spec.ts` (4 cases)                                   | Fallback when no runtime config; AppSync POST with `x-api-key` and query fragments; Spanish notice mapping; retired notice filtering; `testCmsConnection()` success/failure |
| E2E         | `admin.cms.spec.ts`, `news.interactions.spec.ts`, `business-directory.spec.ts` | Admin hub copy/models; news UI with stubbed PDF                                                                                                                             |

**Gaps:** No test for `refreshContent()` race/error recovery at scale; no test against **real** AppSync; `EmailAlias` model not covered in store tests; **in-app CMS editing** not tested (Studio-only).

---

#### Documents & archive (`DocumentHub`, upload)

| Proof       | File(s)                                                                               | What it actually proves                                                                                           |
| ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Vitest      | —                                                                                     | —                                                                                                                 |
| `*.spec.ts` | `document-hub.spec.ts`, `document-upload.component.spec.ts`, `records-center.spec.ts` | Hub titles, CMS doc merge, load-more; upload component calls mocked upload/delete/CMS create; records guide links |
| E2E         | `docs-hub.spec.ts`, `home.smoke.spec.ts` (search → archive)                           | Hub visible, archive deep link                                                                                    |

**Gaps:** **`DocumentUploadService`** (`uploadData`, `list`, `remove`, `getStorageKeyFromHref`) — **no direct tests**. **Budget import** — N/A. Real S3 ACL/size/type enforcement untested.

---

#### Weather forecast (`LocalizedWeatherPanel`, NWS proxy)

| Proof       | File(s)                                         | What it actually proves                                                                                                                                                                                               |
| ----------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | `weather-panel.vitest.ts` (8 cases)             | Signup labels/validation; successful signup POST (mocked); invalid destination blocked; proxy vs browser NWS; proxy failure + fallback; alert emit null vs summary; **forecastGdd** computed (12) from mocked periods |
| `*.spec.ts` | `app.spec.ts` (weather cases)                   | Homepage primer/proxy/banner integration with TestBed                                                                                                                                                                 |
| Infra       | `nws-weather-proxy/index.test.mjs`              | Point/forecast/alert/hourly aggregation, CORS, error paths (mocked `fetch`)                                                                                                                                           |
| E2E         | `home.weather.spec.ts`, `feature-pages.spec.ts` | `/weather` renders; mocked NWS routes                                                                                                                                                                                 |

**Gaps:** **`HomepageWeatherAlertPrimer`** — only via `app.spec.ts`, no dedicated file. Live NWS rate limits / API key rotation untested.

---

#### Severe-weather signup (Python backend + form POST)

| Proof  | File(s)                                                  | What it actually proves                                                                                                                                                     |
| ------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest | `weather-panel.vitest.ts` (`submitAlertSignup`)          | Frontend POST body and UI feedback with **mocked** HTTP                                                                                                                     |
| Infra  | `severe-weather-signup/tests/test_app.py` (30+ `test_*`) | Pending/active/unsubscribe; ZIP 81092; email/SMS validation; bilingual confirm/translate; scheduled delivery; duplicate subscriptions; developer test route + secrets; CORS |
| E2E    | `app.spec.ts`, `home.weather.spec.ts`                    | Signup form visible when config enabled                                                                                                                                     |

**Gaps:** No automated test from browser → **deployed** Lambda URL in staging/prod. SMS sandbox/production SNS not proven in CI.

---

#### Payments — Paystar (`PaystarConnectionService`, proxy)

| Proof       | File(s)                                                            | What it actually proves                                                                                                                   |
| ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | `paystar-config.vitest.ts` (6), `paystar-connection.vitest.ts` (2) | Runtime mode resolution; API failure throws with vendor or default message                                                                |
| Infra       | `paystar-proxy/index.test.mjs` (5)                                 | GET mode `hosted`; POST returns portal `launchUrl`; receipt **501**; missing portal **500**; CORS default origin                          |
| `*.spec.ts` | `app.spec.ts` (Paystar CTA), `payment-panel.spec.ts` (3)           | Hosted button when config present                                                                                                         |
| E2E         | `payments.spec.ts`, `home.interactions.spec.ts`                    | Mock Paystar/bill-pay routes; form validation; offline queue mentioned in feature map — **verify:** queue replay not found in smoke specs |

**Gaps:**

- **`queuePaymentOffline` / `syncPendingPayments`** in `paystar-connection.ts` — **no unit or E2E tests**
- **`createLaunchRequest` success path** — untested (only failures)
- **Upstream REST launch** (`tryUpstreamLaunch`, `mapUpstreamJsonToTownLaunchResponse`) — **untested**
- **Amount in cents** (`amountInCents`) — not asserted in tests
- Real Paystar tenant JSON shape — explicitly deferred in proxy comments

---

#### Bill pay early access (`BillPayService`, `PayBillPageComponent`)

| Proof       | File(s)                               | What it actually proves                                                                                           |
| ----------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Vitest      | `bill-pay.service.vitest.ts` (3)      | `api-success`, `mailto` when no endpoint, `api-failure-mailto` on HTTP error                                      |
| `*.spec.ts` | `pay-bill-page.component.spec.ts` (7) | Invalid form blocks submit; valid submit calls service; portal CTA disabled/enabled by Paystar mode               |
| E2E         | `payments.spec.ts`                    | Mock `**/api/v1/bill-pay-requests`; success toast; consent validation; mailto fallback on 500; bilingual redirect |

**Gaps:**

- **`BillPayService.sanitizePayload` / account number stripping** — not tested (only `input-sanitization.vitest.ts` tests generic helper)
- **Production Dynamo/API Lambda** — documented as missing; nothing to test
- E2E proves UI against **route mock**, not deployed API

---

#### Contact update (`ContactUpdateService`, Lambdas, admin review)

| Proof       | File(s)                                | What it actually proves                                                            |
| ----------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| Vitest      | `contact-update.service.vitest.ts` (2) | API failure → mailto; empty endpoint → mailto                                      |
| `*.spec.ts` | —                                      | **No** spec for `ContactUpdateReviewService` or `CmsAdmin` contact tab logic       |
| Infra       | —                                      | **`contact-update-lambda`**, **`contact-updates-review`** — **no automated tests** |
| E2E         | `admin.cms.spec.ts`                    | Tab “Contact updates” **visible**; does not prove Dynamo scan or CSV               |

**Gaps:** Highest-risk **PII write + admin read** path is largely **unproven** beyond client-side POST mocks.

---

#### Resident services & mailto forms (`ResidentServices`, panels)

| Proof       | File(s)                                                                                                                       | What it actually proves                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Vitest      | `resident-services.vitest.ts` (10)                                                                                            | Portal/issue validation messages; **mailto href** encoding for issue/records/contact update (prototype harness, not full component) |
| `*.spec.ts` | `resident-services.spec.ts`, `issue-panel.spec.ts`, `records-panel.spec.ts`, `payment-panel.spec.ts`, `weather-panel.spec.ts` | Panel wiring / shallow behavior                                                                                                     |
| E2E         | `forms-and-empty-states.spec.ts`, `form-labeling-complete.spec.ts`, `feature-pages.spec.ts`                                   | Labels and empty states on `/services`                                                                                              |

**Gaps:** Full **`ResidentServices` component** submit flows (Paystar launch, `ContactUpdateService.submitUpdate`, bill pay from portal form) — not integration-tested in Vitest; E2E does not assert mailto opened.

---

#### Meetings & calendar (`meetings-page.helpers.ts`)

| Proof       | File(s)                                | What it actually proves                                                                    |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Vitest      | `meetings-page.helpers.vitest.ts` (4)  | `buildMeetingItems`, `buildCalendarItems`, date parsing/formatting, ICS/Google link inputs |
| `*.spec.ts` | `meetings-page.spec.ts` (6)            | Page renders with CMS mock                                                                 |
| E2E         | `public-route-health`, `feature-pages` | `/meetings` heading and calendar region                                                    |

**Gaps:** Recurrence edge cases; timezone/DST; full `MeetingsPage` + FullCalendar integration — shallow.

---

#### AI / Wiley Widget (`LocalizedAiChat`, embed scripts)

| Proof        | File(s)                                              | What it actually proves                                        |
| ------------ | ---------------------------------------------------- | -------------------------------------------------------------- |
| Vitest       | —                                                    | **`localized-ai-chat.ts` — no tests**                          |
| E2E          | `home.chat.spec.ts`                                  | Mock `**/mock-chatbot` API; conversation panel renders replies |
| E2E (opt-in) | `cow-embed-loader.spec.ts`, `home.cow-popup.spec.ts` | Stub `chat.min.js`; popup script loads                         |

**Gaps:** Easy Peasy **embed** path; proxy (`easy-peasy-chat-proxy`); prompt injection / abuse limits — untested in CI.

---

#### Permits, legal, accessibility

| Area                 | Proof                                                                      | Gaps                                                                     |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Permits              | `permits.component.spec.ts`, `permits.spec.ts` E2E                         | Clerk copy only — appropriate                                            |
| Legal pages          | `privacy-page.spec.ts`, `terms-page.spec.ts`, `accessibility-page.spec.ts` | Static copy smoke                                                        |
| Accessibility report | `accessibility-support.vitest.ts` (4)                                      | Form validation via harness; **not** full `AccessibilityPage` E2E submit |

---

#### Cross-cutting

| Proof  | File(s)                                                                                                                                                  | What it actually proves                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Vitest | `input-sanitization.vitest.ts`, `global-error-handler.vitest.ts`, `internal-route-link.vitest.ts`, `site-language.vitest.ts`, `runtime-config.vitest.ts` | Sanitize helper; error handler toast; route normalization; language persistence; Amplify configure from runtime |
| E2E    | `global-error-handler.spec.ts`, `accessibility-focus.spec.ts`, `language-public-pages.spec.ts`                                                           | Uncaught error UX; keyboard/ARIA; ES public pages                                                               |

---

### Business-critical logic — weak or missing coverage

| Logic                                                                            | Risk                | Test status                               |
| -------------------------------------------------------------------------------- | ------------------- | ----------------------------------------- |
| **Utility payment amounts** (`PaystarConnectionService` → proxy `amountInCents`) | Money               | **Not asserted** in any test              |
| **Paystar upstream mapping**                                                     | Money / redirects   | **Zero tests** for real upstream `fetch`  |
| **Offline payment queue** (`queuePaymentOffline`, replay)                        | Money / data loss   | **No tests**                              |
| **Bill pay sanitization** (`BillPayService.sanitizePayload`, account regex)      | PII / fraud         | **No dedicated tests**                    |
| **Contact update Lambda** (Dynamo `PutItem`, SES)                                | PII                 | **No tests** in repo                      |
| **Contact updates review** (Dynamo `Scan`, admin CSV)                            | PII leak            | **No tests**; E2E UI-only                 |
| **S3 document upload** (`DocumentUploadService.uploadDocument`)                  | Integrity / malware | **Mocked only**                           |
| **`CmsPublicDocumentAdminService` GraphQL mutations**                            | Public data         | **Mocked only** in upload component spec  |
| **Budget import / calculations**                                                 | Fiscal              | **Not applicable** — no code              |
| **Email alias router**                                                           | Mail integrity      | **7 Python tests** — good for that module |
| **Severe-weather delivery scheduler**                                            | Safety              | **Strong Python coverage**                |

---

## Proof map: tests → implementation methods

Use this table to connect CI proof to the methods named in Phase 1. “—” means no meaningful direct test.

### Angular services & functions

| Implementation                                           | Test file                           | Test name / area          | Proves                                                  |
| -------------------------------------------------------- | ----------------------------------- | ------------------------- | ------------------------------------------------------- |
| `BillPayService.submitRequest`                           | `bill-pay.service.vitest.ts`        | 3 `it(...)`               | Outcomes: `api-success`, `mailto`, `api-failure-mailto` |
| `BillPayService.sanitizePayload` (private)               | —                                   | —                         | **Gap**                                                 |
| `ContactUpdateService.submitUpdate`                      | `contact-update.service.vitest.ts`  | 2 `it(...)`               | Mailto fallback paths                                   |
| `PaystarConnectionService.createLaunchRequest`           | `paystar-connection.vitest.ts`      | 2 `it(...)`               | Throws on HTTP error only                               |
| `PaystarConnectionService.queuePaymentOffline`           | —                                   | —                         | **Gap**                                                 |
| `getPaystarRuntimeConfig`                                | `paystar-config.vitest.ts`          | 6 `it(...)`               | Mode/URL merge from `window.__TOW_RUNTIME_CONFIG__`     |
| `getBillPayRuntimeConfig`                                | —                                   | (mocked in service tests) | Indirect                                                |
| `getContactUpdateRuntimeConfig`                          | —                                   | (mocked)                  | Indirect                                                |
| `getChatbotRuntimeConfig`                                | —                                   | —                         | **Gap**                                                 |
| `sanitizePlainText`                                      | `input-sanitization.vitest.ts`      | 3 `it(...)`               | NUL/whitespace/length                                   |
| `LocalizedCmsContentStore` load/test                     | `site-cms-content.spec.ts`          | 4 `it(...)`               | Fallback, GraphQL normalize, connection test            |
| `LocalizedWeatherPanel.submitAlertSignup`                | `weather-panel.vitest.ts`           | signup tests              | Valid/invalid POST (mock HTTP)                          |
| `LocalizedWeatherPanel` NWS load/fallback                | `weather-panel.vitest.ts`           | proxy/browser/fallback    | Data path selection                                     |
| `buildMeetingItems` / `buildCalendarItems`               | `meetings-page.helpers.vitest.ts`   | 4 `it(...)`               | Calendar/meeting DTO shaping                            |
| `createGoogleCalendarLinkForEvent` / ICS helpers         | —                                   | —                         | **Gap** (used indirectly via helpers tests)             |
| `ResidentServices.buildIssueMailtoHref`                  | `resident-services.vitest.ts`       | mailto suite              | Encoded subject/body/recipient                          |
| `ResidentServices.buildRecordsMailtoHref`                | `resident-services.vitest.ts`       | mailto suite              | Same                                                    |
| `ResidentServices.buildContactUpdateMailtoHref`          | `resident-services.vitest.ts`       | mailto suite              | Same                                                    |
| `ResidentServices.portalFieldMessage`                    | `resident-services.vitest.ts`       | validation suite          | Required/email messages                                 |
| `GlobalErrorHandler.handleError`                         | `global-error-handler.vitest.ts`    | 3 `it(...)`               | Toast + log                                             |
| `getAppRouteLink` / `isPathRegisteredAppRoute`           | `internal-route-link.vitest.ts`     | 13 `it(...)`              | Route normalization                                     |
| `SiteLanguageService.setLanguage`                        | `site-language.vitest.ts`           | 3 `it(...)`               | localStorage + signal                                   |
| `DocumentUploadService.*`                                | `document-upload.component.spec.ts` | mocks only                | **Not real implementation**                             |
| `CmsPublicDocumentAdminService.createDocumentFromUpload` | `document-upload.component.spec.ts` | mocks                     | **Not real GraphQL**                                    |
| `ContactUpdateReviewService.loadContactUpdates`          | —                                   | —                         | **Gap**                                                 |
| `LocalizedAiChat` (sendMessage, embed)                   | `home.chat.spec.ts` (E2E)           | programmatic chat         | Mock API only                                           |
| `App` (search, calendar, banner)                         | `app.spec.ts`                       | 24 `it(...)`              | Integration-level homepage                              |
| `PayBillPageComponent.onSubmit`                          | `pay-bill-page.component.spec.ts`   | submit/portal CTA         | Delegates to mocked `BillPayService`                    |

### Infrastructure handlers

| Implementation                                | Test file                        | Proves                                                |
| --------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| `nws-weather-proxy` `handler`                 | `index.test.mjs`                 | Aggregated JSON, CORS, fetch error handling           |
| `paystar-proxy` `handler`                     | `index.test.mjs`                 | Hosted launch, GET status, receipt 501, CORS          |
| `paystar-proxy` `tryUpstreamLaunch`           | —                                | **Gap**                                               |
| `severe-weather-signup` `handler` / scheduler | `tests/test_app.py`              | Subscriptions, delivery, i18n, unsubscribe, dev route |
| `email-alias-router` `handler`                | `tests/test_app.py`              | Forwarding, alias match, health                       |
| `site-monitor` `app.py`                       | `site-monitor/tests/test_app.py` | Basic health (run via `test:infra:monitor`)           |
| `contact-update-lambda` `handler`             | —                                | **Gap**                                               |
| `contact-updates-review` `handler`            | —                                | **Gap**                                               |
| `easy-peasy-chat-proxy` `handler`             | —                                | **Gap**                                               |

### Playwright smoke → user journeys

| Spec                                                    | Proves (resident-visible)                                       |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `public-route-health.spec.ts`                           | Each route in `e2e/support/public-routes.ts` loads + heading    |
| `payments.spec.ts`                                      | `/pay-bill` form, mock API, mailto fallback, consent validation |
| `home.smoke.spec.ts`                                    | Homepage sections, search → archive                             |
| `home.weather.spec.ts`                                  | Weather page with mocks                                         |
| `home.chat.spec.ts`                                     | Ask Wiley API mode with mock endpoint                           |
| `admin.cms.spec.ts`                                     | `/admin` models/tabs; clerk redirect                            |
| `docs-hub.spec.ts`                                      | Document hub search/archive                                     |
| `business-directory.spec.ts`                            | Directory search                                                |
| `permits.spec.ts`                                       | Clerk messaging                                                 |
| `global-error-handler.spec.ts`                          | Friendly error surface                                          |
| `accessibility-focus.spec.ts`                           | Keyboard/ARIA on key flows                                      |
| `language-public-pages.spec.ts`                         | Spanish on subpages                                             |
| `megamenu-*.spec.ts`                                    | Link integrity                                                  |
| `deep-link-validation.spec.ts`                          | SPA deep links                                                  |
| `live-hosting.spec.ts` / `live-hosting-headers.spec.ts` | Optional live probes (environment-dependent)                    |

---

### Suggested test priorities (ties to Phase 1 action steps)

Align new tests with inventory **P0/P1** — not implemented here, only ranked for planning:

1. **P0:** Integration test or contract test for `contact-update-lambda` + secured `contact-updates-review` (or E2E with test double in AWS sandbox).
2. **P0:** `PaystarConnectionService` success + `queuePaymentOffline` / replay; paystar-proxy upstream mapping fixture from Paystar sample JSON.
3. **P0:** `BillPayService` sanitization tests (account number strip, max lengths).
4. **P1:** `DocumentUploadService` with Amplify Storage mocked at SDK boundary (not component stub).
5. **P1:** Vitest or split tests for `App` search index helpers (extract from monolith first).
6. **P2:** `LocalizedAiChat` unit tests; enable `cow-embed-loader` in nightly CI.

---

### Commands to reproduce this analysis

```bash
npm run test:vitest
npm run test:unit:browser
npm run test:infra
npm run test:infra:alerts
npm run test:infra:mail
npm run test:e2e:smoke
npm run test:coverage   # Vitest coverage report (src/**/*.vitest.ts only)
```

---

## Phase 3: Quality and dead code audit

**Generated:** 2026-05-22
**Scope:** Correctness, resident trust, maintainability — not style-only nits. Findings are prioritized **P0 (highest impact)** → **P3 (lower)**.

---

### Summary

| Priority | Theme                        | Representative finding                                                                                                                                      |
| -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Payments misrepresented      | `PaystarConnectionService` (API launch, offline queue, receipts) is **not called** from any production component; docs/E2E imply API mode from the browser  |
| **P0**   | PII without client hardening | `ContactUpdateService` and mailto builders send **unsanitized** form text; review endpoint **silently returns `[]`** on failure                             |
| **P0**   | Trust-breaking placeholders  | ~~Hosted Paystar placeholder URL~~ **Remediated AP-03** — CTA disabled when `portalUrl` empty; verify on prod deploy                                        |
| **P1**   | Dead / unwired code          | Offline payment queue, `getReceipt`, `cms-content.ts` re-export barrel; ~~`enablePaystarApi`~~ **removed AP-24a**                                           |
| **P1**   | Silent failures              | `DocumentUploadService.getDocuments` returns `[]` on list errors; per-key URL failures skipped in loop                                                      |
| **P2**   | Duplication & monolith       | Duplicate mailto/contact helpers; `app.ts` + `resident-services.ts` + `pay-bill-page` Paystar URL logic; 3k-line homepage                                   |
| **P2**   | Docs vs code drift           | ~~Paystar row in `e2e-feature-map.md`~~ **Remediated AP-02a** — documents hosted `resolveQuickPayHref` only; `PaystarConnectionService` still unwired in UI |
| **P3**   | Low-value / cosmetic         | `forecastGdd` on weather page; `archive/hello-world/` scorer tree; committed debug `archive/artifacts/`                                                     |

---

### P0 — Correctness and user trust

#### 1. Paystar API path is implemented but not wired (dead service)

**Files:** `src/app/payments/paystar-connection.ts` — `createLaunchRequest`, `getReceipt`, `queuePaymentOffline`, `syncQueuedPayments`

**Finding:** Grep across `src/` shows **no component or service injects `PaystarConnectionService`**. Production payment UX uses **`resolveQuickPayHref()`** (`src/app/payments/paystar-quick-pay.ts`) from:

- `src/app/resident-services/resident-services.ts` (`quickPayState` computed)
- `src/app/pay-bill/pay-bill-page.component.ts`

Residents get a **hosted portal `<a href>`** when `portalUrl` is set, or a **disabled CTA** when unset (AP-03). In-app Paystar API launch and offline queue remain **unimplemented** in UI. The proxy (`infrastructure/paystar-proxy/`) and Vitest tests exercise code that **does not run in the shipped UI**.

**Impact:** Operators may believe `mode: 'api'` enables checkout; it does not. ~~E2E `enablePaystarApi()`~~ **removed (AP-24a).** Offline toast copy in `OfflineConnectivityNotifier` (“form submissions will sync”) still implies `syncQueuedPayments()` — **not invoked** (AP-08).

**Doc drift:** **Remediated AP-02a** — `docs/e2e-feature-map.md` documents hosted-only behavior. **Remaining:** deprecate or delete `PaystarConnectionService` after clerk confirms Path A (AP-02b/d).

---

#### 2. Placeholder Paystar URL active while UI suggests live pay

**Files:**

- `src/app/pay-bill/pay-bill-request.ts` — `PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL`
- `src/app/pay-bill/pay-bill-page.component.ts` — `quickPayHref`, `quickPayIsPlaceholder` (lines ~189–196)
- `src/app/resident-services/resident-services.ts` — same computed pattern (~592–598)
- `src/app/resident-services/panels/payment-panel.html` — placeholder `p-message` when `quickPayIsPlaceholder()`

**Finding:** When `portalUrl` is empty but Paystar is not `none`, the site still links to `https://secure.paystar.io/pay/townofwiley-utility` with only an **info** message. Wrong portal or 404 erodes trust more than a disabled button.

**Remediation (2026-05-22):** **AP-03 complete in repo** — `resolveQuickPayHref()` in `src/app/payments/paystar-quick-pay.ts`; `/pay-bill` and `/services` disable the portal CTA when `portalUrl` is unset (no synthetic href). Deploy + smoke required to close in production.

**Impact:** Resident-facing money path.

---

#### 3. Contact updates: no client sanitization; weak admin read path

**Files:**

- `src/app/contact-update/contact-update.service.ts` — `submitUpdate` (raw POST body)
- `src/app/resident-services/resident-services.ts` — `openContactUpdateMailto` (~938–948) builds request from form without `sanitizePlainText`
- `infrastructure/contact-update-lambda/index.mjs` — allowlist + `String(v).slice(0, 1000)` only (no email/phone validation)
- `src/app/clerk-setup/contact-update-review.service.ts` — `getAllUpdates()` catch → **`return []`**
- `infrastructure/contact-updates-review/index.mjs` — scan endpoint; security comments require IAM

**Finding:** ~~Unlike `BillPayService.sanitizePayload`, contact updates could send unnormalized text~~ **Client remediated AP-06 (2026-05-22)** — `sanitizeContactUpdateRequest` before POST. Admin UI (`CmsAdmin`) still cannot distinguish “no records” vs “Lambda failed” because `getAllUpdates()` swallows errors (**AP-07**).

**Impact:** PII integrity, clerk trust in admin tab.

---

#### 4. Bill pay sanitization only on one path

**Files:** `src/app/pay-bill/bill-pay.service.ts` — `sanitizePayload` (private); used only in `submitRequest`

**Finding:** Sanitization is **not** shared with `ResidentServices.onPortalAccessSubmit` (passes raw form values into `submitRequest` — sanitization happens inside service, good) but **account number regex** and length caps are **untested** (Phase 2). Mailto body in `buildMailtoHref` uses request after sanitization — OK for API path.

**Gap:** Mailto-only path still exposes resident text in URL length limits — acceptable risk but unbounded `notes` in mailto could truncate silently in some clients.

---

#### 5. No budget import / calculation modules (scope clarity)

**Finding:** No import pipelines or fiscal math in repo (confirmed Phase 1). Risk is **content** only: static guides and search keywords, not wrong totals from code.

---

### P1 — Silent failures, weak error handling, risky patterns

#### 6. Document upload and listing

| Location                                                 | Behavior                                                                 | Risk                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `DocumentUploadService.getDocuments` (~115–117)          | `catch` → `console.error` → **`return []`**                              | Clerk sees empty list, not an error                                              |
| `DocumentUploadService` list loop (~108–110)             | Per-item `getUrl` failure logged, **skipped**                            | Partial archive without UI signal                                                |
| `DocumentUploadService.uploadDocument`                   | No server-side type verify beyond PrimeNG `accept` + 10MB                | Malicious extension possible if UI bypassed                                      |
| `DocumentUploadComponent.uploadFiles`                    | Rollback delete on CMS failure (`deleteDocument.catch(() => undefined)`) | Orphan S3 if delete fails — **silent**                                           |
| `CmsPublicDocumentAdminService.createDocumentFromUpload` | `authMode: 'iam'`                                                        | Depends on Cognito guest/IAM in browser — fragile if identity pool misconfigured |

**Validation present:** `document-upload.component.html` — `accept`, `[maxFileSize]="10485760"`.

---

#### 7. CMS and document hub

| Location                                              | Behavior                                              | Risk                                                                 |
| ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `LocalizedCmsContentStore.loadContent`                | On error → `loadState: 'error'` + bundled fallback    | Good degradation; easy to miss that live CMS is down                 |
| `DocumentHub.resolveCmsDocumentHrefs`                 | catch → `hrefResolutionError` signal                  | **Good** — user-visible in template                                  |
| `site-cms-content.ts` — `KNOWN_CMS_TEXT_TRANSLATIONS` | Large hand map (~277+)                                | Untranslated CMS strings pass through to ES UI — **silent** i18n gap |
| `amplify-config.ts`                                   | Hardcoded Cognito pool IDs + default AppSync endpoint | Wrong-env deploy if runtime override missing                         |

---

#### 8. Weather and alerts

| Location                                                         | Behavior                                      | Risk                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `LocalizedWeatherPanel.submitAlertSignup`                        | catch shows user message (vitest covered)     | Good                                                                    |
| `HomepageWeatherAlertPrimer`                                     | `console.warn` on failure; returns null alert | Homepage may show no banner without user message                        |
| `localized-weather-panel.ts` — `forecastGdd` computed (~527–538) | Simple GDD sum for display                    | Not validated agronomically — **low** trust risk if labeled as official |
| `OfflineConnectivityNotifier`                                    | Claims sync when online                       | **Misleading** (no sync wired)                                          |

**Backend:** `severe-weather-signup/app.py` is comparatively rigorous (validated in Python tests).

---

#### 9. AI chat (`LocalizedAiChat`)

**File:** `src/app/ai-chat/localized-ai-chat.ts` — `sendMessage` (~282–307)

**Finding:** Bare `catch { }` → generic retry message; no `LoggingService` on failure. `parseBotResponse` accepts loose JSON/text — fine for UX, weak for auditing abuse. **No unit tests** on this component.

**Embed path:** `public/easy-peasy-loader.js`, `cow-video-popup.js` — third-party script; opt-in E2E only.

---

#### 10. Logging inconsistency

**Pattern:** `LoggingService` used in pay/contact/paystar services, but **`console.error` only** in:

- `document-upload.service.ts`
- `document-upload.component.ts`
- `document-hub/document-hub.ts`
- `news/news.ts`
- `contact-update-review.service.ts`

**Impact:** Production issues may not reach `logging.endpoint` beacons.

---

#### 11. Global error handler

**File:** `src/app/global-error-handler.ts` — `handleError`

**Finding:** Solid context + toast; always English summary (“Unexpected Error”) — **not bilingual** unlike rest of site.

---

### P2 — Dead code, stubs, unused modules, duplication

#### 12. Unused or effectively dead exports

| Item                                              | Evidence                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/cms-content.ts`                          | Re-exports `LocalizedCmsContentStore`; **no imports** from `./cms-content` elsewhere                  |
| `PaystarConnectionService` + offline queue        | No callers in `src/` (see P0)                                                                         |
| ~~`e2e/pages/home.page.ts` — `enablePaystarApi`~~ | **Removed 2026-05-22 (AP-24a)** — use `enablePaystarHostedWithoutPortal` / `enablePaystarPortal` only |
| `infrastructure/contact-update-lambda/`           | Deployed path exists; **no `index.test.mjs`** in `npm run test:infra`                                 |
| `infrastructure/contact-updates-review/`          | Same                                                                                                  |
| `infrastructure/easy-peasy-chat-proxy/`           | Same                                                                                                  |

---

#### 13. Duplicated logic (maintainability + drift risk)

| Concern                                              | Locations                                                                                                      |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Paystar portal URL + placeholder flag                | `resident-services.ts`, `pay-bill-page.component.ts`, overlapping copy strings                                 |
| `getContactHref` / `getEmailAddress` / `findContact` | `resident-services.ts` (~851–865), `accessibility-support.ts` (~171–185) — **near copy-paste**                 |
| `buildMailtoHref` (URLSearchParams subject/body)     | `resident-services.ts` (~1026+), `accessibility-support.ts` (~187+), `bill-pay.service.ts` (`buildMailtoHref`) |
| Bilingual COPY blobs                                 | Every page component + massive `APP_COPY` in `app.ts`                                                          |
| Calendar/meeting mapping                             | `app.ts` homepage calendar vs `meetings-page.helpers.ts` — parallel event shaping                              |
| Default clerk email fallbacks                        | `deb.dillon@townofwiley.gov` in multiple files                                                                 |

---

#### 14. Overly complex / low-value hotspots

| File                                                            | Notes                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/app/app.ts` (~3,020 lines)                                 | Search index, calendar, mega-menu, hero, notices, `APP_COPY` EN/ES — high regression cost |
| `src/app/site-cms-content.ts` (~1,300 lines)                    | GraphQL mapping + translation dictionary + store                                          |
| `src/app/cms-admin/cms-admin.ts` (~1,000 lines)                 | Mostly static clerk guidance + connection test                                            |
| `src/app/resident-services/resident-services.ts` (~1,040 lines) | Four panels orchestration + forms + mailto                                                |
| `src/app/weather-panel/localized-weather-panel.ts` (~950 lines) | Forecast + signup + hourly/solar/AQI/GDD                                                  |

---

#### 15. Non-product trees in repo

| Path                                | Role                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `archive/hello-world/`              | Web codegen scorer prompts (per `archive/hello-world/README.md`) — not town site        |
| `.generated/easy-peasy-chat-proxy/` | Generated proxy copy                                                                    |
| `archive/artifacts/debug/`          | Visual audit PNGs, temp HTML — should not ship to residents; verify git tracking policy |

---

### P3 — AI-generated or unreviewed signals

These are **heuristics**, not proof of origin:

| Signal                                                     | Where                                                                            | Concern                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Large bilingual prose blocks, evenly structured            | `app.ts` `APP_COPY`, `accessibility-support.ts` commitments                      | Hard to regression-test; typos (“Metodo”) suggest manual merge not review |
| “Future production shape” comment block                    | `bill-pay.service.ts` (lines 30–39)                                              | Scaffold documented but not built — reads like plan pasted into prod      |
| Paystar proxy “guesses” comment + field mapping            | `infrastructure/paystar-proxy/index.mjs` — `mapUpstreamJsonToTownLaunchResponse` | Integration stub shipped adjacent to real hosted mode                     |
| `resident-services.vitest.ts` prototype harness with `any` | Tests **private methods** via `ResidentServices.prototype`                       | Useful but brittle; suggests tests added after monolith                   |
| Mock archive HTML in `public/documents/archive/`           | `test-council-agenda-*`, `mock-approved-minutes-*`                               | Could be mistaken for official records                                    |
| `incomplete-items-reference.md` “Done When” still open     | Checklist `[x]` elsewhere                                                        | Process drift, not code                                                   |

**`LocalizedAiChat`:** Structured prompt chips, embed/API/offline modes, and `parseBotResponse` flexibility match typical AI-assistant templates; **no unit tests** increases “generated but unreviewed” risk.

---

### Quality audit × test coverage crosswalk

| Finding (this section)                           | Test gap (Phase 2)                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `PaystarConnectionService` unwired               | Vitest tests **dead code**; gives false confidence                                 |
| `syncQueuedPayments` never called                | No tests; offline copy untested                                                    |
| Contact update sanitization                      | No tests; Lambda untested in CI                                                    |
| `getAllUpdates` → `[]` on error                  | No `CmsAdmin` / service tests                                                      |
| Placeholder Paystar URL                          | E2E checks href when portal enabled, not placeholder hazard when `portalUrl` empty |
| `DocumentUploadService.getDocuments` silent `[]` | Component mocks service — never asserts behavior                                   |

---

### Records: prioritized remediation backlog (audit only)

| ID   | Priority | Item                                                                     | Primary files                                                                   |
| ---- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Q-1  | P0       | Wire or remove `PaystarConnectionService`; align docs/E2E                | `paystar-connection.ts`, `payment-panel`, `pay-bill-page`, `e2e-feature-map.md` |
| Q-2  | P0       | Disable placeholder portal link when URL unset (match `mode: 'none'` UX) | `pay-bill-page.component.ts`, `resident-services.ts`                            |
| Q-3  | P0       | Sanitize contact-update payloads; surface admin load errors              | `contact-update.service.ts`, `contact-update-review.service.ts`, `cms-admin.ts` |
| Q-4  | P0       | Secure/contact-test `contact-updates-review` Lambda                      | `infrastructure/contact-updates-review/`                                        |
| Q-5  | P1       | Fix offline copy or implement `syncQueuedPayments` on `online` event     | `offline-connectivity.service.ts`, `paystar-connection.ts`                      |
| Q-6  | P1       | Propagate document list/resolve errors to UI; use `LoggingService`       | `document-upload.service.ts`, `document-hub.ts`                                 |
| Q-7  | P1       | Add infra tests for contact-update Lambdas                               | `infrastructure/contact-update-lambda/`, `contact-updates-review/`              |
| Q-8  | P2       | Extract shared `mailto` / contact helper; split `app.ts`                 | `resident-services.ts`, `accessibility-support.ts`, `app.ts`                    |
| Q-9  | P2       | Delete or repoint `cms-content.ts` barrel                                | `cms-content.ts`                                                                |
| Q-10 | P3       | Remove or gate mock archive HTML from production search index            | `document-archive.ts`, `public/documents/archive/`                              |

---

### Document maintenance (Phase 3)

- Re-run dead-code checks after Paystar wiring: `rg "PaystarConnectionService" src/`
- When Q-1 closes, update `docs/e2e-feature-map.md` Paystar row to match actual browser behavior.
- Link remediation IDs **Q-\*** to Phase 1 action steps **P0–P2** where they overlap.

---

## Phase 4: Consolidated action plan (2–4 weeks)

**Generated:** 2026-05-22
**Inputs:** Phase 1 inventory, Phase 2 test coverage, Phase 3 quality/dead-code audit, and Phase 1 “Action steps” / **Q-\*** backlog.

### Risk levels

| Level                 | Meaning                                                                                          | Address when                                           |
| --------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| **High Risk**         | Wrong money path, PII exposure, silent data loss, or public trust break                          | **Week 1** (before promoting billing/contact features) |
| **Medium Risk**       | Degraded ops/clerk workflows, misleading UX, weak tests on live integrations, security hardening | **Weeks 2–3**                                          |
| **Low Risk / Polish** | Maintainability, performance, i18n depth, non-blocking content cleanup                           | **Week 4+** or parallel when capacity allows           |

### Master issue register

Issues are numbered **AP-** (action plan) for tracking. Cross-refs: **Q-** (Phase 3), Phase 1 step **#**.

| ID    | Risk       | Issue / gap                                                                                                                                        | Primary evidence                                | Key files / systems                                                 |
| ----- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| AP-01 | **High**   | Production `runtime-config.js` not verified against Amplify env and secrets                                                                        | Phase 1 §7; Phase 1 step #1                     | `scripts/generate-runtime-config.mjs`, Amplify console              |
| AP-02 | **High**   | **Paystar API unwired** — `PaystarConnectionService` unused in UI; **docs/E2E aligned (AP-02a/c)**; deprecate/delete service pending Path A        | Phase 3 P0 #1; Q-1; Phase 2                     | `paystar-connection.ts`, `e2e-feature-map.md`                       |
| AP-03 | **High**   | ~~**Placeholder Paystar URL**~~ **Fixed in repo (2026-05-22)** — CTA disabled when `portalUrl` empty; verify after prod deploy                     | Phase 3 P0 #2; Q-2                              | `paystar-quick-pay.ts`, `pay-bill-page`, `resident-services`        |
| AP-04 | **High**   | **Bill-pay backend absent** — intake is mailto or optional POST only; success path untested in prod                                                | Phase 1; `bill-pay.service.ts` comment; Phase 2 | `bill-pay.service.ts`, infra (not in repo)                          |
| AP-05 | **High**   | ~~Contact-update review Lambda publicly scannable~~ **Mitigated 2026-05-23** — review URL **AWS_IAM** + browser uses review proxy only             | Phase 3 P0 #3; Q-4; Phase 1 step #3             | `contact-updates-review/index.mjs`, `contact-updates-review-proxy/` |
| AP-06 | **High**   | ~~Contact updates not sanitized on client~~ **Fixed in repo** — `sanitizeContactUpdateRequest`; Lambda `sanitize-body.mjs` + tests                 | Phase 3 P0 #3; Q-3; Phase 2                     | `contact-update-sanitize.ts`, `contact-update-lambda/`              |
| AP-07 | **High**   | ~~Admin contact tab silent failure~~ **AP-07a/b Done in repo** — `getAllUpdates()` result type + `cms-admin` error banner; **AP-07c** E2E optional | Phase 3 P0 #3; Phase 2                          | `contact-update-review.service.ts`, `cms-admin.ts`                  |
| AP-08 | **High**   | **Misleading offline copy** (“submissions will sync”) with no `syncQueuedPayments`                                                                 | Phase 3 P0 #1; Q-5                              | `offline-connectivity.service.ts`                                   |
| AP-09 | **High**   | Mock/test archive HTML discoverable via search (trust)                                                                                             | Phase 1 docs; Q-10; Phase 1 step #6             | `public/documents/archive/`, `document-archive.ts`, `app.ts` search |
| AP-10 | **Medium** | Paystar **hosted** go-live: confirm real `portalUrl` / mode; staging smoke                                                                         | Phase 1 step #2; Phase 2 E2E mocks only         | `paystar-config.ts`, `paystar-proxy/`                               |
| AP-11 | **Medium** | Paystar proxy **upstream JSON mapping** is guessed; receipt **501**                                                                                | Phase 3; Phase 1 step #8; Phase 2               | `infrastructure/paystar-proxy/index.mjs`                            |
| AP-12 | **Medium** | ~~**No CI tests** for contact-update write Lambdas~~ **Partial** — `sanitize-body` + `index.test.mjs`; review Lambda still open                    | Phase 2; Q-7                                    | `contact-update-lambda/`, `contact-updates-review/`                 |
| AP-13 | **Medium** | **BillPay sanitization** (account strip, lengths) untested                                                                                         | Phase 2; Phase 3 P0 #4                          | `bill-pay.service.ts`, `input-sanitization.ts`                      |
| AP-14 | **Medium** | Document upload: **list errors → `[]`**, partial URL failures skipped                                                                              | Phase 3 §6; Q-6                                 | `document-upload.service.ts`                                        |
| AP-15 | **Medium** | Upload **rollback** can orphan S3 if delete fails after CMS failure                                                                                | Phase 3 §6                                      | `document-upload.component.ts`                                      |
| AP-16 | **Medium** | **WAF / rate limits** on public Lambda URLs not in repo                                                                                            | Phase 1 feature-completion-spec; step #10       | AWS console / API Gateway                                           |
| AP-17 | **Medium** | **S3 upload AV / metadata** policy not implemented                                                                                                 | Phase 1 step #11                                | S3 / Amplify storage                                                |
| AP-18 | **Medium** | Severe-weather signup: **prod Lambda URL** not in browser CI path                                                                                  | Phase 2                                         | `localized-weather-panel.ts`, deploy scripts                        |
| AP-19 | **Medium** | **AppSync API key** in client; rotation/runbook gap                                                                                                | Phase 1 §4; Phase 1 review §D                   | `amplify-config.ts`, `site-cms-content.ts`                          |
| AP-20 | **Medium** | CMS Spanish via **manual map** — untranslated Studio strings leak to ES UI                                                                         | Phase 3 §7                                      | `site-cms-content.ts` `KNOWN_CMS_TEXT_TRANSLATIONS`                 |
| AP-21 | **Medium** | **`LoggingService` vs `console.error`** split — ops blind spots                                                                                    | Phase 3 §10                                     | upload/CMS/news/review services                                     |
| AP-22 | **Medium** | **`LocalizedAiChat`** — bare catch, no unit tests; embed path weak in CI                                                                           | Phase 2; Phase 3 §9                             | `localized-ai-chat.ts`, `cow-embed-loader.spec.ts`                  |
| AP-23 | **Medium** | Global error handler toast **English-only**                                                                                                        | Phase 3 §11                                     | `global-error-handler.ts`                                           |
| AP-24 | **Medium** | ~~**`enablePaystarApi` dead helper**~~ **AP-24a done**; vitest on `PaystarConnectionService` still gives false confidence (AP-24b open)            | Phase 3 §12                                     | `paystar-connection.vitest.ts`                                      |
| AP-25 | **Medium** | Production config drift: **hardcoded Cognito/AppSync** defaults                                                                                    | Phase 3 §7                                      | `amplify-config.ts`                                                 |
| AP-26 | **Low**    | Dead export **`cms-content.ts`** barrel (unused)                                                                                                   | Phase 3 Q-9                                     | `cms-content.ts`                                                    |
| AP-27 | **Low**    | Duplicate **mailto / contact helpers** across components                                                                                           | Phase 3 §13                                     | `resident-services.ts`, `accessibility-support.ts`                  |
| AP-28 | **Low**    | **`app.ts` monolith** (~3k lines) — regression and review cost                                                                                     | Phase 1 §5; Phase 3 §14                         | `app.ts`                                                            |
| AP-29 | **Low**    | Split homepage search/calendar into modules (no behavior change)                                                                                   | Phase 1 step #12; Phase 2                       | `app.ts`, `meetings-page.helpers.ts`                                |
| AP-30 | **Low**    | ~~Repo clutter~~ **Addressed 2026-05-22** — `archive/` for non-production paths; see `archive/README.md`                                           | Phase 3 §15                                     | `archive/`, `.gitignore`                                            |
| AP-31 | **Low**    | Lighthouse / perf staging gate optional                                                                                                            | Phase 1 step #15                                | `npm run perf:lighthouse:staging`                                   |
| AP-32 | **Low**    | Applitools / visual baseline optional                                                                                                              | Phase 1 step #16                                | `e2e/specs/applitools/`                                             |
| AP-33 | **Low**    | Reconcile **`incomplete-items-reference.md`** “Done When” vs shipped reality                                                                       | Phase 3 §15                                     | `docs/incomplete-items-reference.md`                                |
| AP-34 | **Low**    | **`forecastGdd`** display — clarify non-official if kept                                                                                           | Phase 3 §8                                      | `localized-weather-panel.ts`                                        |
| AP-35 | **Low**    | Future product: records/issue **tracking API** (mailto-only today)                                                                                 | Phase 1 out of scope                            | `resident-services.ts`                                              |

**Explicitly deferred (not in 4-week plan unless leadership reprioritizes):** budget import, online permits, full in-app CMS editor, Paystar in-app API unless AP-02 decision is “wire now.”

---

### Recommended order of attack (weeks 1–4)

Protect **money → PII → honest public content → integrations → maintainability**.

#### Week 1 — Stop trust and data leaks (High Risk)

**Goal:** No resident or clerk is misled about payments; no exposed PII; production config known.

| Order | AP IDs       | Deliverable                                                                                                                                                                                               | Owners       |
| ----- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1     | AP-01        | Runbook entry: prod/staging `runtime-config.js` values documented; Amplify env matches `generate-runtime-config` inputs                                                                                   | DevOps       |
| 2     | AP-03, AP-10 | **Paystar decision memo** (hosted-only vs defer API): fix placeholder link (disable CTA or require real `portalUrl`); verify hosted URL on staging                                                        | Clerk + Dev  |
| 3     | AP-02        | **Partial 2026-05-22:** AP-02a/c + AP-24a merged in branch `ap-02a-paystar-docs-e2e-cleanup` (commit `59d601a`). **Remaining:** AP-02b/d after clerk Path A — deprecate/delete `PaystarConnectionService` | Dev + Clerk  |
| 4     | AP-04        | **Bill-pay decision**: deploy `bill-pay-requests` API **or** label UI “email clerk only” and remove mock E2E assumption                                                                                   | Clerk + Dev  |
| 5     | AP-05, AP-07 | IAM on review Lambda; admin UI shows load error (not empty table)                                                                                                                                         | DevOps + Dev |
| 6     | AP-06        | `sanitizePlainText` on contact-update POST; mirror Lambda validation tests                                                                                                                                | Dev          |
| 7     | AP-09        | Clerk removes or labels mock archive; drop from search index if removed                                                                                                                                   | Clerk + Dev  |
| 8     | AP-08        | Fix offline toast **or** remove “will sync” language                                                                                                                                                      | Dev          |

#### Week 1 exit criteria

- [ ] Staging smoke: `npm run test:e2e:smoke` green on staging URL (Phase 1 step #5).
- [x] No placeholder Paystar link without visible “not configured” state _(AP-03 code merged; confirm on staging/prod after deploy)_.
- [ ] Contact review endpoint not public-unauthenticated.
- [ ] Mock agendas/minutes not indexed as official documents.

---

#### Week 2 — Prove integrations and harden submissions (Medium Risk, integration-focused)

**Goal:** Tests and behavior match what production actually runs.

| Order | AP IDs              | Deliverable                                                                                                      | Owners       |
| ----- | ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| 1     | AP-12, AP-13        | Add `index.test.mjs` (or pytest) for contact Lambdas; vitest for `BillPayService.sanitizePayload`                | Dev          |
| 2     | AP-11               | Paystar proxy: document tenant JSON sample; update `mapUpstreamJsonToTownLaunchResponse` or keep hosted-only     | Dev + vendor |
| 3     | AP-14, AP-15, AP-21 | Document upload: surface list/resolve errors in UI; `LoggingService` on failures; test `getDocuments` error path | Dev          |
| 4     | AP-18               | Manual or scripted check: alert signup against deployed severe-weather API (not only mocks)                      | DevOps       |
| 5     | AP-24               | ~~Remove `enablePaystarApi`~~ **Done (AP-24a)**; AP-24b rename vitest suite for hosted-only reality              | Dev          |
| 6     | AP-22               | `LocalizedAiChat`: log failures; minimal vitest for `parseBotResponse` / error path                              | Dev          |
| 7     | AP-16, AP-17        | Ops tickets: WAF/throttle on Function URLs; S3 upload policy (can complete in AWS without app deploy)            | DevOps       |

#### Week 2 exit criteria

- [ ] `npm run test:infra` includes contact-update tests (extend script if needed).
- [ ] Admin upload/list shows error state when S3/CMS fails.
- [x] Paystar behavior documented in `e2e-feature-map.md` matches code after AP-02a _(2026-05-22; confirm after PR merge to `main`)_.

---

#### Week 3 — Clerk workflows and CMS trust (Medium Risk)

**Goal:** Staff tools reliable; bilingual/CMS gaps understood.

| Order | AP IDs         | Deliverable                                                                          | Owners      |
| ----- | -------------- | ------------------------------------------------------------------------------------ | ----------- |
| 1     | AP-19          | Document API key rotation + Amplify Studio publish checklist in `CLERK-CMS-GUIDE.md` | Clerk + Dev |
| 2     | AP-20          | CMS i18n decision record: expand map vs Studio fields vs EN-only CMS content         | Product     |
| 3     | AP-23          | Bilingual global error toast (or link to `/contact`)                                 | Dev         |
| 4     | AP-05 (retest) | E2E or manual: `/admin` contact updates tab with IAM-protected endpoint              | Dev         |
| 5     | —              | Full **`audit:done:local`** before any production tag                                | Dev         |
| 6     | AP-33          | Update `incomplete-items-reference.md` “Done When” to match AP-01–AP-09 outcomes     | Dev         |

#### Week 3 exit criteria

- [ ] Clerk can publish document + see failure if CMS/S3 breaks.
- [ ] `audit:done:local` passes on release branch.

---

#### Week 4 — Polish and reduce future cost (Low / Medium carryover)

**Goal:** Lower regression cost; no new features unless scheduled.

| Order | AP IDs              | Deliverable                                                                                | Owners  |
| ----- | ------------------- | ------------------------------------------------------------------------------------------ | ------- |
| 1     | AP-27, AP-28, AP-29 | Extract shared `mailto`/contact helper; optional first slice out of `app.ts` (search only) | Dev     |
| 2     | AP-26               | Delete unused `cms-content.ts` or add lint rule                                            | Dev     |
| 3     | AP-30               | **Done 2026-05-22** — `archive/` folder; `archive/README.md`; paths updated in docs        | Dev     |
| 4     | AP-31, AP-32        | Optional: Lighthouse staging + Applitools/nightly embed (`TOW_E2E_CHATBOT_EMBED=1`)        | Dev     |
| 5     | AP-34               | Weather copy: label GDD as informal estimate if retained                                   | Content |
| 6     | AP-35               | Backlog ticket only if mailto volume warrants records API                                  | Product |

#### Week 4 exit criteria

- [ ] No unused Paystar/dead-code paths without comment in README or this doc.
- [ ] Next quarter backlog captured in GitHub issues linked to **AP-** IDs.

---

### Decision gates (resolve in Week 1)

These block clean implementation; record outcomes in this file or a linked issue.

| Decision                  | Options                                                                                                                                                                       | Affects AP IDs                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Paystar product shape** | A) Hosted portal link only — remove `PaystarConnectionService` usage/docs. B) In-app API launch — wire service + proxy + E2E. C) Defer online pay — disable CTAs, clerk-only. | AP-02, AP-03, AP-10, AP-11, AP-24 |
| **Bill pay persistence**  | A) Build Dynamo/API per `bill-pay.service.ts`. B) Mailto-only + copy change.                                                                                                  | AP-04, AP-13                      |
| **Contact review access** | A) IAM + signed admin proxy. B) Clerk VPN-only Function URL.                                                                                                                  | AP-05, AP-07                      |

---

### Mapping: legacy IDs → action plan

| Legacy               | AP IDs                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| Phase 1 steps #1–5   | AP-01, AP-03, AP-04, AP-05, AP-10, staging smoke                            |
| Phase 1 steps #6–11  | AP-09, AP-16, AP-17, AP-11, AP-33                                           |
| Phase 1 steps #12–17 | AP-28, AP-29, AP-20, AP-21, AP-31, AP-32, AP-35                             |
| Q-1 … Q-10           | AP-02, AP-03, AP-06, AP-07, AP-05, AP-08, AP-14, AP-12, AP-27, AP-26, AP-09 |

---

### Success metrics (end of week 4)

| Outcome          | How to verify                                                                     |
| ---------------- | --------------------------------------------------------------------------------- |
| **Money**        | Real or intentionally disabled Paystar; no placeholder checkout without warning   |
| **PII**          | Contact write sanitized; review endpoint authenticated; admin errors visible      |
| **Public trust** | No mock minutes/agendas in search; legal/weather copy honest                      |
| **Correctness**  | Tests cover paths that actually run in production (not dead Paystar service only) |
| **Ops**          | `audit:done:local` + documented runtime config + clerk runbook updated            |

---

### Document maintenance (Phase 4)

- When an **AP-** item closes, mark it in your issue tracker and add one line under the relevant week’s exit criteria.
- After Paystar decision (AP-02), run: `rg "PaystarConnectionService" src/` and update Phase 2 proof map.
- Re-audit quarterly: refresh **Generated** date and re-run Phases 2–3 sections if major features ship.

---

## Phase 5: Incremental remediation plan (High + Medium)

**Generated:** 2026-05-22
**Scope:** **AP-01–AP-25** only. Each slice is one PR-sized change.

### Remediation progress log

| AP ID | Slice        | Status      | PR / notes                                                                                                                                                                                                                                                                                                                                                       |
| ----- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AP-01 | AP-01a       | **Done**    | Runbook § “Runtime config verification” in `docs/amplify-deployment-runbook.md`                                                                                                                                                                                                                                                                                  |
| AP-01 | AP-01b       | **Open**    | Ops: compare Amplify env to live `/runtime-config.js` on staging/prod                                                                                                                                                                                                                                                                                            |
| AP-01 | AP-01c       | **Done**    | Clerk hard-refresh + IT env change steps in `CLERK-CMS-GUIDE.md` § “When IT changes…”                                                                                                                                                                                                                                                                            |
| AP-03 | AP-03a–d     | **Done**    | PR [#30](https://github.com/Bigessfour/Townofwiley/pull/30) merged 2026-05-22: `paystar-quick-pay.ts` + vitest; pay-bill + resident-services + `payments.spec.ts` (`enablePaystarHostedWithoutPortal`); CI [26311705310](https://github.com/Bigessfour/Townofwiley/actions/runs/26311705310) green (prior fail 26305712397 was newsletter E2E — fixed `294e566`) |
| AP-02 | AP-02a       | **Done**    | `docs/e2e-feature-map.md`: hosted portal `href` via `resolveQuickPayHref`; no `PaystarConnectionService` in production UI — PR [#34](https://github.com/Bigessfour/Townofwiley/pull/34) merged 2026-05-22                                                                                                                                                        |
| AP-02 | AP-02c       | **Done**    | Removed dead `enablePaystarApi` from `e2e/pages/home.page.ts` — PR #34                                                                                                                                                                                                                                                                                           |
| AP-02 | AP-02b,d     | **Done (2026-06-20)** | Path A: deleted `PaystarConnectionService`, `paystar-api-contract.ts`, `paystar-embedded-contract.ts`, `paystar-connection.vitest.ts`, and `infrastructure/paystar-proxy/` |
| AP-02 | All          | **Blocked** | Path A doc/E2E slices done; **Path B** (wire API) still awaits leadership decision                                                                                                                                                                                                                                                                               |
| AP-06 | AP-06a–d     | **Done**    | PR [#35](https://github.com/Bigessfour/Townofwiley/pull/35): `contact-update-sanitize.ts`, service + resident-services, Lambda `sanitize-body.mjs` + `index.test.mjs`                                                                                                                                                                                            |
| AP-24 | AP-24a       | **Done**    | PR #34 — removed unused `enablePaystarApi` E2E helper                                                                                                                                                                                                                                                                                                            |
| —     | Node pin     | **Done**    | Pin **24.16.0** on `main` (PR #34): `.nvmrc`, Amplify, GHA, Volta/mise; [`NODE_VERSION.md`](./NODE_VERSION.md)                                                                                                                                                                                                                                                   |
| AWS   | Hosting sync | **Done**    | 2026-05-22: `customHttp.yml` → app headers (both S3 bucket hostnames in CSP); DynamoDB `TownOfWileyContactUpdates` **ACTIVE**; reconcile live buildSpec to **24.16.0**                                                                                                                                                                                           |
| AWS   | IaC SSOT     | **Done**    | 2026-05-22: manifests + `verify:aws-infra` + [AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md) — PR #35                                                                                                                                                                                                                                                   |
| AP-05 | AP-05a–c     | **Done**    | 2026-05-23: Lambdas deployed; review **AWS_IAM**; proxy + Amplify env; prod runtime-config contact keys; deploy scripts hardened (Windows npm, CORS, smithy sigv4)                                                                                                                                                                                               |
| AP-10 | —            | **Open**    | Set real `PAYSTAR_PORTAL_URL` on Amplify when clerk has URL                                                                                                                                                                                                                                                                                                      |
| AP-30 | —            | **Done**    | `archive/` housekeeping — `hello-world/`, `artifacts/` moved; `docs/README.md` index                                                                                                                                                                                                                                                                             |

**Next recommended slice (2026-05-23):** **AP-01b** runtime-config audit → **AP-07c** (admin contact E2E) → commit deploy/E2E fixes. Ops: **AP-10**, **amplify:sync-buildspec**, **AP-16**, **AP-19** (AppSync key expires **2026-06-22**). See § **Next iteration plan**.

### Open pull requests (2026-05-22)

| PR / branch                                                                                                        | Type                                                     | Disposition                                         |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| [#35](https://github.com/Bigessfour/Townofwiley/pull/35) `ap-06-contact-sanitize`                                  | AP-06 sanitization + IaC SSOT                            | **Merge** after rebase push + CI green              |
| [#28](https://github.com/Bigessfour/Townofwiley/pull/28)                                                           | Feature (weather CORS, leadership roster, CI classifier) | **Rebase** onto `main`; conflicts; not Dependabot   |
| [#31](https://github.com/Bigessfour/Townofwiley/pull/31), [#32](https://github.com/Bigessfour/Townofwiley/pull/32) | Dependabot — `actions/setup-node` / `checkout` v6        | **Merge** — updates `copilot-setup-steps.yml` only  |
| [#33](https://github.com/Bigessfour/Townofwiley/pull/33)                                                           | Dependabot — PrimeNG patch                               | **Merge** when smoke green                          |
| [#29](https://github.com/Bigessfour/Townofwiley/pull/29)                                                           | Dependabot — aws-amplify minor                           | **Merge** after smoke; spot-check `/admin`          |
| [#24](https://github.com/Bigessfour/Townofwiley/pull/24)                                                           | Dependabot — testing group                               | **Merge** when smoke green                          |
| [#26](https://github.com/Bigessfour/Townofwiley/pull/26), [#27](https://github.com/Bigessfour/Townofwiley/pull/27) | Dependabot — Tailwind 4.3.0                              | **Close or rebase** — stale smoke failures (May 11) |

**Legend — test strategy:**

| Strategy            | When to use                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Test-first**      | Behavior is well-defined before code exists (new validation, new error type, Lambda contract). |
| **Test-around**     | Legacy code works; add characterization tests, then change.                                    |
| **Refactor + test** | Extract function/module, move tests with it, then fix behavior.                                |

**CI baseline (every slice):** `npm run lint` → `npm run test:vitest` → `npm run test:unit:browser` (if `*.spec.ts` touched) → extend `test:infra` when `infrastructure/` touched → `npm run test:e2e:smoke` when routes/forms/copy change. Full gate before release: `npm run audit:done:local`.

---

### AP-01 — Verify production runtime config (High)

_Ops-first; no app refactor required._

| Slice  | Work                                                                                                                              | Proven correct                                                       | Tests                                              | Strategy                                      | CI                         |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | -------------------------- |
| AP-01a | Document expected keys in `docs/amplify-deployment-runbook.md` (`cms`, `payments.paystar`, `weather`, `contactUpdate`, `billPay`) | Checklist matches `scripts/generate-runtime-config.mjs` output shape | None in repo                                       | N/A (docs)                                    | **Done 2026-05-22**        |
| AP-01b | Compare Amplify branch env vars to generated `public/runtime-config.js` on staging after deploy                                   | Diff shows no missing Paystar/CMS/weather endpoints                  | Optional script: curl staging `/runtime-config.js` | Test-around (manual assertion log in runbook) | **Open** — ops manual step |
| AP-01c | Clerk section: after Amplify env change, redeploy `main` + hard-refresh (`CLERK-CMS-GUIDE.md`)                                    | Clerk steps reproducible                                             | None                                               | N/A                                           | **Done 2026-05-22**        |

---

### AP-02 — Paystar service wiring vs removal (High)

**Prerequisite:** Week 1 decision — **hosted-only (recommended default)** vs **wire API**.

#### Path A — Hosted-only (remove dead API surface)

| Slice  | Work                                                                                                                                                                | Proven correct                                              | Tests                                           | Strategy                       | CI                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- | ------------------------------ | ------------------- |
| AP-02a | Update `docs/e2e-feature-map.md`: browser uses portal `href` only, not `PaystarConnectionService` POST                                                              | Doc matches `rg PaystarConnectionService src/` → no injects | None                                            | N/A                            | **Done 2026-05-22** |
| AP-02b | Deleted `PaystarConnectionService` and related API/embedded contract files (Path A hosted-only) | `rg PaystarConnectionService src/` → no matches | Deleted `paystar-connection.vitest.ts` | Refactor + test (shrink tests) | **Done 2026-06-20** |
| AP-02c | Remove dead `enablePaystarApi` from `e2e/pages/home.page.ts` **or** guard with comment + `test.skip`                                                                | No references in smoke specs                                | E2E grep                                        | Refactor                       | **Done 2026-05-22** |
| AP-02d | Deleted `paystar-connection.vitest.ts` and full Paystar API scaffold                                                              | Vitest count matches reality                                | Deleted vitest file | Test-around                    | **Done 2026-06-20** |

#### Path B — Wire API (only if product commits)

| Slice   | Work                                                                                                           | Proven correct                                         | Tests                                                   | Strategy                                      | CI                        |
| ------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | --------------------------------------------- | ------------------------- |
| AP-02b′ | Inject `PaystarConnectionService` in `PayBillPageComponent` / payment panel for `mode === 'api'` launch button | Click triggers POST to `apiEndpoint`; hosted unchanged | Vitest: mock HTTP success returns `launchUrl`           | Test-first (service already partially tested) | `test:vitest` + new smoke |
| AP-02c′ | Call `syncQueuedPayments()` from `OfflineConnectivityNotifier` on `online` event                               | Queue drains when back online                          | Vitest: localStorage queue + mock `createLaunchRequest` | Test-first                                    | `test:vitest`             |
| AP-02d′ | E2E: use `enablePaystarApi` in `payments.spec.ts` against mock route                                           | Smoke proves UI path                                   | `payments.spec.ts` mock route                           | Test-around                                   | `test:e2e:smoke`          |

---

### AP-03 — Placeholder Paystar URL (High)

| Slice  | Work                                                                                                                                               | Proven correct                                                                | Tests                                                                    | Strategy    | CI                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------- | ------------------- |
| AP-03a | Extract `resolveQuickPayHref(config): { href: string \| null; isPlaceholder: boolean }` in `src/app/payments/paystar-quick-pay.ts` (new ~30 lines) | Single function used by both pages                                            | Vitest: empty `portalUrl` + `mode hosted` → `href null` or disabled flag | Test-first  | **Done 2026-05-22** |
| AP-03b | Wire `pay-bill-page.component.ts` to helper; **disable** anchor when `href` null                                                                   | No link to `PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL` unless explicit config | `pay-bill-page.component.spec.ts`: placeholder shows disabled CTA        | Test-around | **Done 2026-05-22** |
| AP-03c | Wire `resident-services.ts` + `payment-panel` inputs same as AP-03b                                                                                | `/services` matches `/pay-bill` behavior                                      | `payment-panel.spec.ts` update                                           | Test-around | **Done 2026-05-22** |
| AP-03d | E2E: hosted without `portalUrl` → no paystar href; `mode: none` case pre-existing                                                                  | No placeholder paystar href in DOM                                            | `payments.spec.ts` + `enablePaystarHostedWithoutPortal`                  | Test-around | **Done 2026-05-22** |

---

### AP-04 — Bill-pay persistence path (High)

| Slice                | Work                                                                                        | Proven correct                          | Tests                                                   | Strategy    | CI                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| AP-04a               | **Decision slice (no code):** issue template: mailto-only vs API                            | Comment on AP-04 in tracker             | —                                                       | —           | —                                                                  |
| AP-04b (mailto-only) | Copy pass: remove “submitted to system” if no API; toast says clerk email                   | Strings match behavior                  | `pay-bill-page.component.spec.ts` snapshot of copy keys | Test-around | `test:e2e:smoke` `payments.spec.ts` (drop mock API test or rename) |
| AP-04c (API)         | Add minimal Lambda stub in repo + wire `billPay.apiEndpoint` in runtime config              | POST returns 201; service `api-success` | Extend `bill-pay.service.vitest.ts` (exists)            | Test-first  | `test:infra` + `test:vitest`                                       |
| AP-04d (API)         | E2E keeps mock `**/api/v1/bill-pay-requests` only when endpoint configured in test override | No false success when endpoint empty    | `payments.spec.ts`                                      | Test-around | `test:e2e:smoke`                                                   |

---

### AP-05 — Secure contact-updates review Lambda (High)

| Slice  | Work                                               | Proven correct      | Tests                                           | Strategy    | CI            |
| ------ | -------------------------------------------------- | ------------------- | ----------------------------------------------- | ----------- | ------------- |
| AP-05a | Ops: Function URL `AuthType: AWS_IAM`              | **Done 2026-05-23** | Manual + `verify:aws-infra`                     | N/A         | —             |
| AP-05b | Review proxy + `contactUpdate.reviewProxyEndpoint` | **Done 2026-05-23** | `TownOfWileyContactUpdatesReviewProxy` deployed | Test-first  | `test:infra`  |
| AP-05c | `ContactUpdateReviewService` uses proxy endpoint   | **Done in repo**    | Service + Amplify env                           | Test-around | `test:vitest` |

---

### AP-06 — Sanitize contact updates (High)

| Slice  | Work                                                                                                   | Proven correct                            | Tests                                        | Strategy    | CI                  |
| ------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------- | ----------- | ------------------- |
| AP-06a | Add `sanitizeContactUpdateRequest()` next to `bill-pay.service.ts` pattern (reuse `sanitizePlainText`) | NUL stripped; max lengths enforced        | `contact-update-sanitize.vitest.ts` new file | Test-first  | **Done 2026-05-22** |
| AP-06b | Call sanitizer in `ContactUpdateService.submitUpdate` before POST                                      | POST body matches sanitized shape         | Extend `contact-update.service.vitest.ts`    | Test-around | **Done 2026-05-22** |
| AP-06c | Call sanitizer in `ResidentServices.openContactUpdateMailto` before mailto/API                         | Same fields cleaned for mailto lines      | `resident-services.vitest.ts` one case       | Test-around | **Done 2026-05-22** |
| AP-06d | `infrastructure/contact-update-lambda/index.test.mjs`: allowlist + truncate (via `sanitize-body.mjs`)  | Matches client caps; unknown keys dropped | Node `node --test`                           | Test-first  | **Done 2026-05-22** |

---

### AP-07 — Admin contact tab errors (High)

| Slice  | Work                                        | Proven correct   | Tests                                           | Strategy    | CI                           |
| ------ | ------------------------------------------- | ---------------- | ----------------------------------------------- | ----------- | ---------------------------- |
| AP-07a | `getAllUpdates()` → `{ ok, data \| error }` | **Done in repo** | `contact-update-review.service.vitest.ts`       | Test-first  | `test:vitest`                |
| AP-07b | `cms-admin.ts` error banner vs empty state  | **Done in repo** | Template `@else if (contactUpdatesLoadError())` | Test-around | `test:unit:browser` optional |
| AP-07c | E2E: mock review failure → visible error    | **Open**         | `admin.cms.spec.ts`                             | Test-around | `test:e2e:smoke`             |

---

### AP-08 — Offline copy honesty (High)

| Slice  | Work                                                                                             | Proven correct | Tests                           | Strategy    | CI                        |
| ------ | ------------------------------------------------------------------------------------------------ | -------------- | ------------------------------- | ----------- | ------------------------- |
| AP-08a | **Slice A (minimal):** Edit `offline-connectivity.service.ts` EN/ES strings — remove “will sync” | Copy accurate  | None or copy snapshot in vitest | Test-around | `test:e2e:smoke` optional |
| AP-08b | **Slice B (only if AP-02 Path B):** `online` → `paystar.syncQueuedPayments()`                    | Queue clears   | Vitest per AP-02c′              | Test-first  | `test:vitest`             |

---

### AP-09 — Mock archive documents (High)

| Slice  | Work                                                                      | Proven correct                        | Tests                                 | Strategy    | CI                  |
| ------ | ------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ----------- | ------------------- |
| AP-09a | Clerk: remove or rename mock HTML files under `public/documents/archive/` | Files gone or prefixed `sample-`      | None                                  | N/A         | —                   |
| AP-09b | Remove entries from `document-archive.ts` manifest                        | Hub no longer lists mocks             | `document-hub.spec.ts`                | Test-around | `test:unit:browser` |
| AP-09c | Remove mock paths from `app.ts` search index seeds if any hardcoded       | Search “mock minutes” returns nothing | `app.spec.ts` or `home.smoke.spec.ts` | Test-around | `test:e2e:smoke`    |
| AP-09d | Add `robots.txt` or on-page “Sample document” banner only if samples kept | Visual distinction                    | Manual                                | Test-around | —                   |

---

### AP-10 — Paystar hosted go-live (Medium)

| Slice  | Work                                                                                | Proven correct                                                         | Tests                                  | Strategy    | CI                        |
| ------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- | ----------- | ------------------------- |
| AP-10a | Set staging/prod `PAYSTAR_PORTAL_URL` in Amplify; regenerate config                 | `getPaystarRuntimeConfig().portalUrl` non-empty in prod build artifact | `paystar-config.vitest.ts` (exists)    | Test-around | `npm run build`           |
| AP-10b | E2E staging job (manual): `home.interactions.spec.ts` href matches real portal host | Link host ≠ placeholder path                                           | `home.interactions.spec.ts` on staging | Test-around | `test:e2e:smoke` with env |
| AP-10c | `paystar-proxy` GET status returns `hosted` in deployed Lambda                      | `index.test.mjs` already covers local                                  | `npm run test:infra`                   | Test-around | `test:infra`              |

---

### AP-11 — Paystar proxy upstream mapping (Medium)

| Slice  | Work                                                                                                                     | Proven correct                              | Tests                         | Strategy    | CI                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ----------------------------- | ----------- | --------------------- |
| AP-11a | Capture one real Paystar launch JSON sample in `infrastructure/paystar-proxy/fixtures/launch-response.json` (no secrets) | Fixture committed                           | None                          | N/A         | —                     |
| AP-11b | Test `mapUpstreamJsonToTownLaunchResponse` via exported test helper or `node --test`                                     | Fixture maps to `launchUrl` + `referenceId` | New cases in `index.test.mjs` | Test-first  | `test:infra`          |
| AP-11c | Wire env vars on Lambda only after AP-11b green                                                                          | Staging POST returns 200 + URL              | Manual smoke                  | Test-around | Deploy + `test:infra` |
| AP-11d | Receipt: leave 501 until template known; document in proxy GET `/` metadata                                              | No false success                            | Existing 501 test             | Test-around | `test:infra`          |

---

### AP-12 — Contact Lambda CI tests (Medium)

| Slice  | Work                                                                            | Proven correct                    | Tests                      | Strategy   | CI                                 |
| ------ | ------------------------------------------------------------------------------- | --------------------------------- | -------------------------- | ---------- | ---------------------------------- |
| AP-12a | `contact-update-lambda/index.test.mjs`: happy PUT, allowlist, 400 bad JSON      | Matches AP-06d                    | New `index.test.mjs` cases | Test-first | Extend `package.json` `test:infra` |
| AP-12b | `contact-updates-review/index.test.mjs`: scan returns array shape; OPTIONS CORS | Unsigned denied if IAM simulated  | New `index.test.mjs` cases | Test-first | `test:infra`                       |
| AP-12c | Single script `scripts/test-contact-infra.mjs` wrapper if paths multiply        | One command for all contact infra | —                          | N/A        | `npm run test:infra`               |

---

### AP-13 — BillPay sanitization tests (Medium)

| Slice  | Work                                                                                             | Proven correct                                        | Tests                                  | Strategy   | CI            |
| ------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------------------------------------- | ---------- | ------------- |
| AP-13a | Export `sanitizePayload` for testing **or** test via public `submitRequest` with HttpClient mock | `accountNumber` strips `!@#`; notes truncated at 2000 | `bill-pay.service.vitest.ts` new cases | Test-first | `test:vitest` |
| AP-13b | One test per field max-length boundary                                                           | No overflow to mailto/API                             | Same file                              | Test-first | `test:vitest` |

---

### AP-14 — Document list/resolve errors (Medium)

| Slice  | Work                                                                                           | Proven correct          | Tests                                   | Strategy        | CI                  |
| ------ | ---------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------- | --------------- | ------------------- |
| AP-14a | Change `getDocuments` to throw or return `Result` type — **prefer:** throw `DocumentListError` | Callers must handle     | `document-upload.service.vitest.ts` new | Test-first      | `test:vitest`       |
| AP-14b | `document-upload.component.ts` `loadUploadedDocuments` shows error signal                      | UI message on list fail | Extend component spec                   | Test-around     | `test:unit:browser` |
| AP-14c | `document-hub.ts`: `hrefResolutionError` already exists — add user-facing copy if true         | Banner visible          | `document-hub.spec.ts`                  | Test-around     | `test:unit:browser` |
| AP-14d | Replace `console.error` with `LoggingService` in `document-upload.service.ts` only             | One service consistent  | Mock logging in vitest                  | Refactor + test | `test:vitest`       |

---

### AP-15 — Upload rollback orphan S3 (Medium)

| Slice  | Work                                                                           | Proven correct             | Tests                                                                                      | Strategy    | CI                  |
| ------ | ------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------ | ----------- | ------------------- |
| AP-15a | If CMS create fails, surface error and set `orphanKey` warning if delete fails | User told to contact clerk | `document-upload.component.spec.ts` (exists) extend: delete throws → error mentions orphan | Test-around | `test:unit:browser` |
| AP-15b | Optional: retry delete once                                                    | Second attempt logged      | Vitest mock                                                                                | Test-first  | `test:vitest`       |

---

### AP-16 — WAF / rate limits (Medium)

| Slice  | Work                                                                                 | Proven correct                     | Tests  | Strategy | CI  |
| ------ | ------------------------------------------------------------------------------------ | ---------------------------------- | ------ | -------- | --- |
| AP-16a | Runbook: list all public Function URLs (Paystar, NWS, weather signup, chat, contact) | Inventory doc                      | None   | N/A      | —   |
| AP-16b | Apply AWS WAF rate rule on one URL (pilot: `paystar-proxy`)                          | 429 after threshold in manual test | Manual | N/A      | —   |
| AP-16c | Repeat per URL (one PR = one URL in runbook checklist)                               | All covered                        | —      | —        | —   |

_No repo CI for WAF; track in ops ticket._

---

### AP-17 — S3 upload AV (Medium)

| Slice  | Work                                                                                   | Proven correct                   | Tests                               | Strategy   | CI            |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------- | ---------- | ------------- |
| AP-17a | Document current bucket policy in runbook                                              | Clerk/dev reference              | —                                   | N/A        | —             |
| AP-17b | Enable GuardDuty malware scan or lambda trigger (ops)                                  | Test upload EICAR blocked        | Manual                              | N/A        | —             |
| AP-17c | App slice: reject `file.type` not in allowlist in `uploadDocument` before `uploadData` | Double validation beyond PrimeNG | `document-upload.service.vitest.ts` | Test-first | `test:vitest` |

---

### AP-18 — Severe-weather prod URL (Medium)

| Slice  | Work                                                                               | Proven correct                                             | Tests                                        | Strategy    | CI                          |
| ------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- | ----------- | --------------------------- |
| AP-18a | Document signup URL in runbook; verify staging config flag                         | `readWeatherRuntimeConfig().signupEnabled` true on staging | `weather-runtime-config` vitest if extracted | Test-around | `npm run build`             |
| AP-18b | Optional smoke: tagged E2E `@integration` skipped in CI, run nightly with real URL | Signup 201 in staging                                      | New spec gated by env                        | Test-around | Separate workflow           |
| AP-18c | Python tests already strong — add one contract test for CORS header if changed     | `test:infra:alerts` green                                  | CORS header contract test in pytest          | Test-around | `npm run test:infra:alerts` |

---

### AP-19 — AppSync API key runbook (Medium)

| Slice  | Work                                                                                                     | Proven correct              | Tests                               | Strategy    | CI                  |
| ------ | -------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------- | ----------- | ------------------- |
| AP-19a | [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md) + EventBridge deploy script | Runbook + reminder deployed; key rotated **2026-06-20**; deletion scheduled Mon 2026-06-22 | `verify:runtime-config-cms`, `verify:appsync-key-deletion-schedule` | N/A         | **Done 2026-06-20** |
| AP-19b | `LocalizedCmsContentStore.testCmsConnection()` documented as clerk smoke test                            | Button in `/admin` works    | `site-cms-content.spec.ts` (exists) | Test-around | `test:unit:browser` |

---

### AP-20 — CMS Spanish gaps (Medium)

| Slice  | Work                                                                                                 | Proven correct         | Tests                                  | Strategy     | CI                  |
| ------ | ---------------------------------------------------------------------------------------------------- | ---------------------- | -------------------------------------- | ------------ | ------------------- |
| AP-20a | Product note: decision EN-only CMS vs expand map                                                     | Record in `docs/`      | —                                      | N/A          | —                   |
| AP-20b | **Incremental:** add 5–10 highest-traffic strings to `KNOWN_CMS_TEXT_TRANSLATIONS` per clerk request | ES notice titles match | `site-cms-content.spec.ts` one ES case | Test-around  | `test:unit:browser` |
| AP-20c | Long-term: GraphQL `locale` field — **out of slice**; spike only                                     | Deferred to backlog    | —                                      | Out of slice | —                   |

---

### AP-21 — Logging consistency (Medium)

| Slice  | Work                                                             | Proven correct            | Tests                       | Strategy        | CI                  |
| ------ | ---------------------------------------------------------------- | ------------------------- | --------------------------- | --------------- | ------------------- |
| AP-21a | `news.ts`: replace `console.error` with `LoggingService`         | One call site             | `news.spec.ts` still passes | Refactor + test | `test:unit:browser` |
| AP-21b | `document-hub.ts` resolve catch → logging                        | Error logged with context | `document-hub.spec.ts`      | Refactor + test | `test:unit:browser` |
| AP-21c | `contact-update-review.service.ts` → logging + AP-07 result type | Combined PR               | vitest                      | Refactor + test | `test:vitest`       |

_One file per PR._

---

### AP-22 — LocalizedAiChat (Medium)

| Slice  | Work                                                                                        | Proven correct                  | Tests                          | Strategy        | CI                          |
| ------ | ------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------ | --------------- | --------------------------- |
| AP-22a | Extract `parseBotResponse(raw: string): BotChatResponse` to `ai-chat/parse-bot-response.ts` | Pure function testable          | `parse-bot-response.vitest.ts` | Refactor + test | `test:vitest`               |
| AP-22b | `sendMessage` catch logs via `LoggingService`                                               | Error context in console/beacon | Vitest mock logging            | Test-around     | `test:vitest`               |
| AP-22c | Nightly workflow step: `TOW_E2E_CHATBOT_EMBED=1` cow spec                                   | Embed loads                     | Existing spec                  | Test-around     | GitHub Actions optional job |

---

### AP-23 — Bilingual global error handler (Medium)

| Slice  | Work                                                 | Proven correct                             | Tests                                   | Strategy    | CI               |
| ------ | ---------------------------------------------------- | ------------------------------------------ | --------------------------------------- | ----------- | ---------------- |
| AP-23a | Inject `SiteLanguageService`; add `ERROR_COPY.en/es` | Toast language follows `tow-site-language` | `global-error-handler.vitest.ts` extend | Test-around | `test:vitest`    |
| AP-23b | E2E `global-error-handler.spec.ts` run in ES locale  | Spanish toast visible                      | Existing spec + locale                  | Test-around | `test:e2e:smoke` |

---

### AP-24 — Paystar E2E/helper alignment (Medium)

| Slice  | Work                                                         | Proven correct             | Tests | Strategy    | CI                  |
| ------ | ------------------------------------------------------------ | -------------------------- | ----- | ----------- | ------------------- |
| AP-24a | Same PR as AP-02a/AP-02c — remove or wire `enablePaystarApi` | No dead exports            | grep  | Refactor    | **Done 2026-05-22** |
| AP-24b | Deleted `paystar-connection.vitest.ts`; hosted-only Paystar surface remains in `paystar-quick-pay.ts` | No dead Paystar API vitest | —     | Test-around | **Done 2026-06-20** |

---

### AP-25 — Hardcoded Amplify defaults (Medium)

| Slice  | Work                                                                                         | Proven correct                         | Tests                             | Strategy    | CI                  |
| ------ | -------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------- | ----------- | ------------------- |
| AP-25a | Add dev-only warning in `amplify-config.ts` if runtime CMS key empty and endpoint is default | Console warn once                      | `runtime-config.vitest.ts` extend | Test-around | `test:vitest`       |
| AP-25b | Fail CI/Amplify build if required prod env empty (`--strict` + manifest)                     | `generate-runtime-config.mjs --strict` | `test:runtime-config-strict`      | Test-around | **Done 2026-05-28** |

---

### Suggested PR sequence (cross-cutting)

Small teams can merge **one slice per PR** in this order (dependencies noted):

```text
Week 1 PRs:
  AP-03a → AP-03b → AP-03c → AP-03d     (Paystar placeholder — no decision needed)
  AP-08a                                  (offline copy)
  AP-06a → AP-06b → AP-06c → AP-06d     (contact sanitize)
  AP-07a → AP-07b                         (admin errors)
  AP-09b → AP-09c                         (mock archive; AP-09a clerk parallel)
  AP-02a + AP-02c + AP-24a                (done — branch ap-02a-paystar-docs-e2e-cleanup)
  AP-02b + AP-02d OR AP-02 Path B          (after clerk decision)
  AP-04b OR AP-04c                        (after decision)
  AP-05a → AP-05b → AP-05c               (ops + app; may span week 2)

Week 2 PRs:
  AP-12a → AP-12b → AP-12c
  AP-13a → AP-13b
  AP-14a → AP-14b → AP-14d → AP-14c
  AP-15a
  AP-11a → AP-11b
  AP-22a → AP-22b
  AP-24a → AP-24b
  AP-21a → AP-21b → AP-21c (one file each)

Week 3 PRs:
  AP-19a → AP-19b
  AP-23a → AP-23b
  AP-20a → AP-20b
  AP-25a
  AP-18a (AP-18b optional)
```

---

### CI command matrix by slice type

| Change type                 | Minimum CI                                 | Before merge to `main`                       |
| --------------------------- | ------------------------------------------ | -------------------------------------------- |
| Vitest-only (`*.vitest.ts`) | `npm run lint` + `npm run test:vitest`     | + `test:unit:browser` if paired spec exists  |
| `*.spec.ts` (Karma)         | + `npm run test:unit:browser`              | + `test:e2e:smoke` if user-facing            |
| `infrastructure/*.mjs`      | + `npm run test:infra`                     | Deploy to staging + manual smoke for Lambdas |
| Routes / copy / forms       | + `npm run test:e2e:smoke`                 | `audit:done:local` for release               |
| Docs / runbook only         | `verify-custom-http-yaml` if CSP mentioned | —                                            |
| Ops (AP-16, AP-17, AP-05a)  | Ticket evidence attached to PR             | No app CI required                           |

---

### Document maintenance (Phase 5)

- Prefix PR titles with slice ID (e.g. `AP-03b: disable placeholder Paystar href`).
- When a slice ships, check the matching Week 1–3 exit criterion in Phase 4.
- After AP-02 path chosen, delete obsolete rows in this section (Path A vs B) to avoid duplicate guidance.

---

## Phase 6: Paystar Embedded Session API — scaffold and reference

**Generated:** 2026-05-22
**Official docs:** [Paystar Embedded Session API](https://docs.paystar.io/api/embedded/)
**OpenAPI:** [embedded-openapi.yaml](https://docs.paystar.io/redocusaurus/embedded-openapi.yaml)
**Frontend SDK (after session URL exists):** [Embedded SDK reference](https://docs.paystar.io/api-docs/embedded/sdk-reference)

Paystar has not yet issued Town of Wiley tenant credentials (`BusinessUnitSlug`, API key). This section records the **methods we plan to use**, how they map to repo code, and what remains blocked until Paystar onboarding.

### Architecture (target)

```text
Resident browser (Angular)
  → POST town proxy (payments.paystar.apiEndpoint)
      body: { sessionType, residentName, serviceAddress, amount, ... }
  → Lambda infrastructure/paystar-proxy/
      header: X-Paystar-Api-Key (env only — never in Angular)
      POST https://{gateway}/integrations/embedded/...
  → Response normalized to PaystarProxyLaunchResponse { launchUrl, referenceId }
  → Optional: open session with Paystar JavaScript Embedded SDK
```

**Hosted portal** (`portalUrl` / legacy redirect) can remain as fallback until Embedded is live.

### Authentication

| Requirement | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| Header      | `X-Paystar-Api-Key`                                                |
| Source      | Paystar Account Manager (not in git)                               |
| Proxy env   | `PAYSTAR_UPSTREAM_API_KEY` (shared name with legacy REST scaffold) |

### Gateway bases (from Paystar docs)

| Environment | Base URL                           |
| ----------- | ---------------------------------- |
| Development | `https://dev-gateway.paystar.io`   |
| Staging     | `https://stage-gateway.paystar.io` |
| Production  | `https://gateway.paystar.io`       |

**Town proxy env:** `PAYSTAR_EMBEDDED_GATEWAY_BASE_URL` (defaults to staging base in scaffold).
**Town proxy env:** `PAYSTAR_BUSINESS_UNIT_SLUG` (required before live calls).

### Embedded session methods — reference table

All paths are relative to the gateway base. Method is **POST**. Responses use envelope `{ hasErrors, errors, data }`.

| Session type           | Paystar operation                         | HTTP path                                                  | Town plan              | Wiley use case                                             |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| **Payment**            | Create Payment Session                    | `/integrations/embedded/initiate`                          | **Planned — imminent** | QuickPay utility bill pay (`/pay-bill`, `/services`)       |
| **AutoPay**            | Create AutoPay Session                    | `/integrations/embedded/initiate-manage-autopay`           | Planned — future       | Recurring utility AutoPay enrollment                       |
| **Paperless**          | Create Paperless Session                  | `/integrations/embedded/initiate-manage-paperless`         | Planned — future       | Paperless billing opt-in                                   |
| **One-time scheduled** | Create One Time Scheduled Payment Session | `/integrations/embedded/initiate-schedule-payment-session` | Planned — future       | Schedule single future payment                             |
| **Manage scheduled**   | Create Manage Scheduled Payments Session  | `/integrations/embedded/initiate-manage-schedule-payments` | Planned — future       | View/cancel scheduled payments                             |
| **Wallet**             | Create Wallet Session                     | `/integrations/embedded/initiate-manage-wallet`            | Deferred               | Saved cards (no `ClientAccount`)                           |
| **Notifications**      | Create Notification Session               | `/integrations/embedded/initiate-manage-notifications`     | Deferred               | Paystar email/SMS prefs (town has separate weather alerts) |

### Payment session (primary — imminent)

**Doc:** [Create Payment Session](https://docs.paystar.io/api/embedded/) — `POST /integrations/embedded/initiate`

**Channel for Town site:** `QuickPay` (not `POS`).

**Request highlights (from spec):**

| Field                      | Town mapping (scaffold)                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `BusinessUnitSlug`         | `PAYSTAR_BUSINESS_UNIT_SLUG` env                                                                       |
| `Channel`                  | `"QuickPay"`                                                                                           |
| `Charges[]`                | One line item; `Amount` in **cents**; optional `ClientAccount` from form `accountNumber`               |
| `ClientUser`               | Email from form; `FirstName`/`LastName` split from `residentName` (immutable after first Paystar sync) |
| `CustomMeta`               | `{ source, locale }` from Angular                                                                      |
| `ReturnUrl` / `SuccessUrl` | Optional; pair required if either set — e.g. `https://townofwiley.gov/pay-bill`                        |
| `ClientReference`          | Optional unique town id (generate per request when wired)                                              |
| `PaymentMethods`           | Omit until tenant enables; optional `["Credit Card"]` / `["ACH"]`                                      |

**Response highlights (200):**

| Field                           | Maps to town `launchUrl`                      |
| ------------------------------- | --------------------------------------------- |
| `data.PaymentSessionIdentifier` | `referenceId`                                 |
| `data.PaymentLogInLink`         | `launchUrl` (open in new tab or Embedded SDK) |
| `data.Status`                   | Logged; e.g. `RequiresPaymentSource`          |

**Scaffold code:**

- Types: `src/app/payments/paystar-embedded-contract.ts` — `PaystarEmbeddedPaymentSessionRequest`, `PaystarEmbeddedPaymentSessionData`
- Proxy builder: `infrastructure/paystar-proxy/paystar-embedded.mjs` — `buildPaymentSessionRequest()`, `tryEmbeddedSession()`
- Browser contract: `PaystarProxyEmbeddedSessionRequest` with `sessionType: 'payment'`

### Manage-account sessions (future)

Shared pattern for AutoPay, Paperless, one-time scheduled, manage scheduled:

| Field           | Notes                                                           |
| --------------- | --------------------------------------------------------------- |
| `SyncAccount`   | `true` when introducing new account (required for new accounts) |
| `ClientAccount` | `AccountNumber`, `Name`, `Address` from resident form           |
| `ClientUser`    | Required; email + split name                                    |

**Response (200):** `data.SessionLink` → town `launchUrl`; `ValidUntil` → optional `expiresAt`.

**Scaffold:** `buildAccountManageSessionRequest()` in `paystar-embedded.mjs` for session types `autopay`, `paperless`, `oneTimeScheduledPayment`, `manageScheduledPayments`.

### Wallet and notification sessions (deferred)

- **Wallet:** `POST /integrations/embedded/initiate-manage-wallet` — `ClientUser` only.
- **Notifications:** `POST /integrations/embedded/initiate-manage-notifications` — `ClientUser` only.

### Data sync rules (from Paystar — design constraints)

| Rule                                                    | Implication for Town                           |
| ------------------------------------------------------- | ---------------------------------------------- |
| Account sync on payment sessions                        | Automatic when `ClientAccount` sent on charges |
| `FirstName` / `LastName` immutable                      | Collect carefully on first successful session  |
| `SyncAccount: true` for new accounts on manage-\* flows | Set when wiring AutoPay/paperless              |
| `Note` and custom account fields not updated on sync    | Do not rely on Paystar to update clerk notes   |

### Repo scaffold inventory (implemented)

| Artifact                                               | Purpose                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/app/payments/paystar-embedded-contract.ts`        | Route constants, TypeScript types, `PAYSTAR_EMBEDDED_SESSION_PLAN`      |
| `src/app/payments/paystar-api-contract.ts`             | Re-exports embedded types; updated `PAYSTAR_INTEGRATION_PHASES`         |
| `infrastructure/paystar-proxy/paystar-embedded.mjs`    | Build upstream bodies, call Paystar, map responses                      |
| `infrastructure/paystar-proxy/index.mjs`               | Routes POST with `sessionType` or `/embedded/` path to embedded handler |
| `src/app/payments/paystar-embedded-contract.vitest.ts` | Route + plan smoke tests                                                |
| `infrastructure/paystar-proxy/index.test.mjs`          | `sessionType: payment` → 501 when env missing                           |

### Browser request shape (when wiring `PaystarConnectionService`)

```json
{
  "sessionType": "payment",
  "residentName": "Pat Citizen",
  "serviceAddress": "10 Oak St, Wiley, CO 81092",
  "accountNumber": "ACC-123",
  "amount": 42.5,
  "preferredContact": "pat@example.com",
  "locale": "en",
  "source": "pay-bill-page",
  "returnUrl": "https://townofwiley.gov/pay-bill",
  "successUrl": "https://townofwiley.gov/pay-bill?paid=1"
}
```

Proxy converts `amount` → `Charges[0].Amount` in cents.

### Lambda environment variables (checklist)

| Variable                            | Required for embedded | Example                            |
| ----------------------------------- | --------------------- | ---------------------------------- |
| `PAYSTAR_EMBEDDED_GATEWAY_BASE_URL` | Yes                   | `https://stage-gateway.paystar.io` |
| `PAYSTAR_BUSINESS_UNIT_SLUG`        | Yes                   | _(from Paystar)_                   |
| `PAYSTAR_UPSTREAM_API_KEY`          | Yes                   | _(from Paystar)_                   |
| `PAYSTAR_PORTAL_URL`                | Optional fallback     | Hosted portal if embedded disabled |

### Incremental slices (updates AP-02 / AP-11)

| Slice  | Work                                                               | Proven correct                                | CI                                          |
| ------ | ------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------- |
| PS-E1  | _(done)_ Contract + proxy scaffold                                 | `test:vitest` + `test:infra` payment 501 test | `npm run test:vitest`; `npm run test:infra` |
| PS-E2  | Receive slug + API key; set Lambda env on staging                  | GET proxy returns `embeddedConfigured: true`  | Manual + deploy                             |
| PS-E3  | Wire `PaystarConnectionService` POST with `sessionType: 'payment'` | Staging creates session; `launchUrl` opens    | `test:vitest` + E2E mock then staging       |
| PS-E4  | Confirm `PaymentLogInLink` vs SDK flow with Paystar                | Clerk UAT on staging                          | Manual                                      |
| PS-E5  | Production config + remove placeholder portal href (AP-03)         | Prod smoke                                    | `test:e2e:smoke`                            |
| PS-E6+ | AutoPay / paperless endpoints when product requests                | Separate session types                        | Per-type infra test                         |

### Blocked until Paystar provides

- `BusinessUnitSlug`
- `X-Paystar-Api-Key`
- Enabled payment methods (Credit Card / ACH) per business unit
- Optional `PaymentFields` keys (pre-configured with Account Manager)
- Webhook / Query API contract for reconciliation (see [Paystar docs](https://docs.paystar.io/) — not scaffolded here)

### Related action plan items

| AP ID | Relationship                                                                                                      |
| ----- | ----------------------------------------------------------------------------------------------------------------- |
| AP-02 | Choose **Embedded** as primary API path (this section) vs delete legacy `PaystarConnectionService` REST guesses   |
| AP-03 | Placeholder `portalUrl` until PS-E5                                                                               |
| AP-10 | Hosted portal fallback until embedded live                                                                        |
| AP-11 | Replace `mapUpstreamJsonToTownLaunchResponse` guesses with `mapEmbeddedEnvelopeToTownLaunch` once tenant confirms |
| AP-24 | ~~`enablePaystarApi`~~ removed (AP-24a); optional: E2E for embedded `sessionType: 'payment'` if Path B            |

### Document maintenance (Phase 6)

- When Paystar issues OpenAPI changes, diff against [embedded-openapi.yaml](https://docs.paystar.io/redocusaurus/embedded-openapi.yaml) and update `paystar-embedded-contract.ts`.
- After credentials exist, redact secrets from this doc — keep env var **names** only.
