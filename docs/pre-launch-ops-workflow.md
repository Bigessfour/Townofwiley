# Pre-launch and post-deploy operations workflow

Operator checklist for [townofwiley.gov](https://townofwiley.gov). This file **links** canonical SSOT docs; it does not duplicate CSP or manifest content.

**Account:** `570912405222` · **Profile:** `townofwiley` · **Region:** `us-east-2` · **Hosting:** S3+CloudFront `E1NZ3XCY5CYR1J` (Amplify app `d331voxr1fhoir` deleted June 2026)

---

## Phase 1 — Every PR that touches CSP or third-party embeds

| Step                      | Command / doc                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------- |
| Edit headers only in SSOT | [`customHttp.yml`](../customHttp.yml) — never `amplify.yml` `customHeaders`        |
| Sync dev server CSP       | `npm run sync:angular-serve-csp`                                                   |
| Verify offline            | `npm run verify:custom-http-yaml`                                                  |
| Update vendor registry    | [`third-party-csp-registry.md`](./third-party-csp-registry.md) when origins change |
| Commit                    | `customHttp.yml` **and** `angular.json` in the same PR                             |

CI job **Verify CSP SSOT** runs on every push. If it fails: `npm run sync:angular-serve-csp && npm run verify:custom-http-yaml`.

Details: [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md) §3, [amplify-deployment-runbook.md](./amplify-deployment-runbook.md) § Sync app-level custom headers.

---

## Phase 2 — After merge to `main` (deploy)

```bash
export AWS_PROFILE=townofwiley
export AWS_REGION=us-east-2

npm run amplify:sync-hosting
npm run verify:aws-infra
npm run verify:live-csp-probe
npm run verify:live-csp-vs-repo
npm run verify:runtime-config-cms
npm run test:e2e:smoke
```

**Pass criteria:** Amplify `main` build succeeded; live CSP matches repo; `runtime-config.js` keys match [`amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json); clerks hard-refresh browsers after env changes ([CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)); PR smoke tier green locally (same as CI `frontend-smoke`).

**Live hosting E2E (after deploy, optional):** GitHub Actions [e2e-live-hosting.yml](../.github/workflows/e2e-live-hosting.yml) (`workflow_dispatch`) — staging (Amplify `main` URL via repo variable `E2E_AMPLIFY_MAIN_URL`) or production (`https://www.townofwiley.gov/`). Locally:

```bash
E2E_BASE_URL=https://www.townofwiley.gov/ npm run test:e2e:live:production
# or
E2E_BASE_URL=https://townofwiley.gov npm run test:e2e:live:staging   # (or https://d34qrz3qxoppc5.cloudfront.net ; old Amplify hosts removed)
```

**Weather CORS (two layers):**

1. Browser **CSP** `connect-src` in `customHttp.yml` (`api.weather.gov`, `*.lambda-url.us-east-2.on.aws`).
2. **Lambda Function URL** — [`infrastructure/nws-weather-proxy/index.mjs`](../infrastructure/nws-weather-proxy/index.mjs) sets `Access-Control-Allow-Origin`; disable duplicate URL-level CORS in the AWS Console to avoid double ACAO headers.

---

## Phase 3 — Observability (initial setup and quarterly repair)

```bash
npm run configure:cloudwatch-logging
npm run verify:aws-infra
```

- **Retention:** 90 days on Town Lambdas, AppSync logs, Amplify backend Lambdas ([AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md) § CloudWatch).
- **AppSync:** steady state `ERROR` field logs; temporary `INFO`/`ALL` only during incidents (`--appsync-field-log-level INFO`).
- **Site health:** `TownOfWileySiteMonitor` Lambda ([`infrastructure/site-monitor/`](../infrastructure/site-monitor/)) — homepage, public routes, `listSiteSettings` GraphQL.
- **CSP drift:** daily GitHub Actions [hosting-headers-drift-watch.yml](../.github/workflows/hosting-headers-drift-watch.yml).
- **Amplify builds:** enable **Build notifications** in Console ([AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md) §1.a); SPA build transcripts are artifact URLs, not customer CloudWatch by default.
- **CloudTrail:** multi-Region trail still an ops ticket if not present ([AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md](./AWS_AMPLIFY_HOSTING_CHANGE_ALERTS.md)).

---

## Phase 4 — Monthly / before major releases

| Tier            | When                                       | Command                                                                                                                | Pass criteria                                                       |
| --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| PR smoke        | Every app/e2e change (CI `frontend-smoke`) | `npm run test:e2e:smoke`                                                                                               | Critical tier green; no new console errors in `public-route-health` |
| Live hosting    | After deploy / weekly                      | [e2e-live-hosting.yml](../.github/workflows/e2e-live-hosting.yml) or `test:e2e:live:production`                        | `live-hosting` + `live-hosting-headers` specs green                 |
| Full regression | Pre-marketing / monthly                    | `npm run test:e2e:regression` or nightly [e2e-regression-nightly.yml](../.github/workflows/e2e-regression-nightly.yml) | All smoke + accessibility + responsive + typography green           |

| Check              | Action                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IDE Playwright MCP | `npm run verify:playwright-mcp` — then reload Cursor/VS Code MCP; confirm **microsoft/playwright-mcp** connects (no `ETARGET` on `@playwright/mcp@1.x`) |
| Bilingual copy     | Clerk checklist — English CMS updates mirrored in Spanish                                                                                               |
| Real devices       | Spot-check contact, weather, and pay flows on **iOS Safari**                                                                                            |
| Dependencies       | `npm audit` — critical blocks CI; schedule high-severity fixes                                                                                          |

Critical smoke file list: [`e2e/smoke-critical.manifest.mjs`](../e2e/smoke-critical.manifest.mjs). Full smoke folder: `npm run test:e2e:smoke:full`.

---

## Quick reference

| Need                   | Doc                                                              |
| ---------------------- | ---------------------------------------------------------------- |
| Hosting / CSP SSOT     | [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md)               |
| Lambdas, DynamoDB, WAF | [AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md)         |
| Amplify failures       | [amplify-deployment-runbook.md](./amplify-deployment-runbook.md) |
| Clerk CMS              | [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)                       |
| Open work tracker      | [post-development-inventory.md](./post-development-inventory.md) |
