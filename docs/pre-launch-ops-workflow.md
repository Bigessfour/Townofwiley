# Pre-launch and post-deploy operations workflow

Operator checklist for [townofwiley.gov](https://townofwiley.gov). This file **links** canonical SSOT docs; it does not duplicate CSP or manifest content.

**Account:** `570912405222` · **Profile:** `townofwiley` · **Region:** `us-east-2` · **Amplify app:** `d331voxr1fhoir`

---

## Phase 1 — Every PR that touches CSP or third-party embeds

| Step | Command / doc |
| ---- | ------------- |
| Edit headers only in SSOT | [`customHttp.yml`](../customHttp.yml) — never `amplify.yml` `customHeaders` |
| Sync dev server CSP | `npm run sync:angular-serve-csp` |
| Verify offline | `npm run verify:custom-http-yaml` |
| Update vendor registry | [`third-party-csp-registry.md`](./third-party-csp-registry.md) when origins change |
| Commit | `customHttp.yml` **and** `angular.json` in the same PR |

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
```

**Pass criteria:** Amplify `main` build succeeded; live CSP matches repo; `runtime-config.js` keys match [`amplify-branch-env.manifest.json`](../infrastructure/amplify-branch-env.manifest.json); clerks hard-refresh browsers after env changes ([CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)).

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

| Check | Action |
| ----- | ------ |
| E2E smoke | `npm run test:e2e:smoke` on release candidates |
| Bilingual copy | Clerk checklist — English CMS updates mirrored in Spanish |
| Real devices | Spot-check contact, weather, and pay flows on **iOS Safari** |
| Dependencies | `npm audit` — critical blocks CI; schedule high-severity fixes |

---

## Quick reference

| Need | Doc |
| ---- | --- |
| Hosting / CSP SSOT | [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md) |
| Lambdas, DynamoDB, WAF | [AWS_INFRASTRUCTURE_SOT.md](./AWS_INFRASTRUCTURE_SOT.md) |
| Amplify failures | [amplify-deployment-runbook.md](./amplify-deployment-runbook.md) |
| Clerk CMS | [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) |
| Open work tracker | [post-development-inventory.md](./post-development-inventory.md) |
