# Week 1 incremental session prompt (AP-01, AP-03, AP-10, AP-02)

**Last updated:** 2026-05-22
Use this prompt in Cursor (or with a coding agent) after attaching `docs/post-development-inventory.md`.
**AP-03:** merged to `main` (PR #30) — verify on deployed hosts; do not re-implement.
**Out of scope for this session:** AP-04 (bill-pay backend), AP-05–AP-09, and large refactors.

---

## Prompt (copy from here)

You are a senior software engineer and site reliability engineer helping stabilize and improve townofwiley.gov, which is already live on AWS Amplify.

We recently completed a full post-development audit (see the attached document `docs/post-development-inventory.md`). The project was originally built with a "whole product" mindset. We are now shifting to a strict **Sum of Parts + Verified Increment** approach.

**Current goal:** Execute the first recommended Week 1 actions safely and incrementally. Focus only on the highest-risk items first.

### Prerequisites (before any slice)

- **Node.js 24.15.0** only (see `.nvmrc`); run `node scripts/ensure-node-version.mjs` if unsure.
- **AWS:** `AWS_PROFILE=townofwiley`, `AWS_REGION=us-east-2`, Amplify app id **`d331voxr1fhoir`**, branch **`main`**.
- **Never paste secrets** (AppSync API keys, Paystar keys) into chat, PRs, or tickets—use yes/no and redacted evidence logs.
- **Hosts for verification:**
  - Production custom domain: `https://townofwiley.gov`
  - Amplify default (pre-prod check): `https://main.d331voxr1fhoir.amplifyapp.com`
  - Live runtime config asset: `{baseUrl}/runtime-config.js` (no-cache; hard-refresh after deploy)
- **Staging:** If a separate Amplify branch exists, use its env vars and `{branch}.d331voxr1fhoir.amplifyapp.com` before production. If no staging branch, verify on Amplify default host first, then production after promote.

### Priority order (this session)

| Order | ID                | Intent                                                                                                              |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1     | **AP-01b/c**      | Verify and document production/staging `runtime-config.js` (AP-01a runbook already done—execute it, do not rewrite) |
| 2     | **AP-03 + AP-10** | **Verify only** deployed Paystar UX (PR #30 on `main`); set `PAYSTAR_PORTAL_URL` when clerk has URL                 |
| 3     | **AP-02**         | Decision only: Path A (hosted-only) vs Path B (wire API)—no implementation until I choose                           |

**Explicitly out of scope:** AP-04 (bill-pay API vs mailto-only). Do not start AP-05–AP-09 unless I reprioritize.

### Rules you must follow

- Work in **small, named slices** only (use audit slice IDs: AP-01b, AP-03d, AP-02a, etc.).
- Every change must include tests or clear verification steps.
- **CI baseline per slice:** `npm run lint` → `npm run test:vitest` → `npm run test:unit:browser` (if any `*.spec.ts` changed) → `npm run test:e2e:smoke` (if routes/forms/copy changed). Before a release tag: `npm run audit:done:local`.
- Prefer **staging / Amplify default host** verification before production changes.
- When a decision is needed (especially AP-02), present clear options with pros/cons and a recommended path.
- Do **not** make large refactors. Stay focused on risk reduction.
- Cite audit evidence by **slice ID and section** (e.g. Phase 5 AP-03 table, Phase 3 § placeholder Paystar URL)—not fragile line numbers.
- After each slice, summarize: what was done, what was proven, and the next logical slice.

### Week 1 session exit criteria

- [ ] **AP-01b:** Evidence log filed (date, verifier, branch, Amplify job id, `build.gitSha`, Paystar `mode`, portalUrl set yes/no, CMS/weather endpoints non-empty yes/no)—template in `docs/amplify-deployment-runbook.md` § Runtime config verification.
- [ ] **AP-01c:** Clerk hard-refresh steps present in `docs/CLERK-CMS-GUIDE.md` (done in repo—confirm wording if you edit).
- [ ] **AP-03:** On deployed host, hosted mode with empty `portalUrl` shows disabled portal CTA and **no** `href` to `secure.paystar.io/pay/townofwiley-utility` (or any synthetic placeholder).
- [ ] **AP-10:** When clerk provides URL, `PAYSTAR_PORTAL_URL` / `PAYSTAR_MODE` set on Amplify `main`, redeployed, and live `payments.paystar.portalUrl` matches intent.
- [ ] **AP-02:** Written decision memo (Path A vs B); **no code** until I approve.
- [ ] `npm run test:e2e:smoke` green locally; optional `E2E_BASE_URL=https://townofwiley.gov npx playwright test e2e/specs/smoke/live-hosting.spec.ts` against production.

---

### Slice 1 — AP-01b/c (runtime config verification)

**Status:** AP-01a **Done** (`docs/amplify-deployment-runbook.md`). Do not duplicate the runbook; **execute** it and close AP-01b/c.

**Your tasks:**

1. Give me the **exact commands** to:
   - List Amplify branch env vars: `aws amplify get-branch --app-id d331voxr1fhoir --branch-name main` (and staging branch if any).
   - Fetch live `runtime-config.js` from production and staging/default host (PowerShell `Invoke-WebRequest` examples are in the runbook).
   - Reproduce shape locally: `npm run generate:runtime-config` with the same env vars (do not commit output).
   - Cross-check maintainer secrets doc: `npm run secrets:status` (local only; no secrets in tickets).
2. Provide a **comparison checklist** mapping Amplify env vars → runtime keys → pass/fail (table in runbook § Expected keys). Include `payments.paystar`, `cms.appSync`, `weather`, `contactUpdate`, `billPay`, `chatbot`, `build.gitSha`.
3. Propose **permanent documentation** only if gaps remain (e.g. evidence log template usage, link from `docs/AMPLIFY_HOSTING_SOT.md` §4). AP-01c clerk steps live in `docs/CLERK-CMS-GUIDE.md` § “When IT changes payment…”.

**Verification (no app code required unless drift found):**

- `e2e/specs/smoke/live-hosting.spec.ts` with `E2E_BASE_URL` set to deployed host.
- Manual: `build.gitSha` on live file matches latest successful `main` deploy.

---

### Slice 2 — AP-03 + AP-10 (Paystar trust — verify, do not re-implement)

**Status:** AP-03a–d **Done in repo** (2026-05-22):

- `src/app/payments/paystar-quick-pay.ts` — `resolveQuickPayHref()`
- Wired: `pay-bill-page.component.ts`, `resident-services.ts`, `resident-services/panels/payment-panel.html`
- Tests: `paystar-quick-pay.vitest.ts`, `pay-bill-page.component.spec.ts`, `payment-panel.spec.ts`, `e2e/specs/smoke/payments.spec.ts` (`enablePaystarHostedWithoutPortal`)

**Do not** re-build placeholder fix unless production still serves an **old bundle** or config bypasses the helper.

**Your tasks:**

1. Confirm current code paths (grep `resolveQuickPayHref`, `PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL`) and summarize behavior for `/pay-bill`, `/services`, and `payment-panel`.
2. Define **staging/prod verification** steps:
   - Inspect live `runtime-config.js` → `payments.paystar.mode` and `portalUrl`.
   - Browser: hosted + empty `portalUrl` → disabled CTA, visible placeholder messaging, no external Paystar `href`.
   - Browser: hosted + real `portalUrl` (AP-10) → enabled CTA with clerk’s URL only.
3. **AP-10 go-live:** Document Amplify env changes (`PAYSTAR_MODE`, `PAYSTAR_PORTAL_URL`), redeploy `main`, hard-refresh, re-run `payments.spec.ts` locally and spot-check production.
4. If deployed site fails verification, propose the **smallest** patch; otherwise only update evidence / runbook.

**Test strategy:**

- Existing unit/E2E above must stay green: `npm run test:vitest`, `npm run test:unit:browser`, `npm run test:e2e:smoke`.
- No new tests unless behavior gap is found on deploy.

---

### Slice 3 — AP-02 decision (Path A implemented 2026-06-20)

Path A (hosted-only) was chosen and implemented: deleted `PaystarConnectionService`, API/embedded contract files, `paystar-connection.vitest.ts`, and `infrastructure/paystar-proxy/`. Production UX uses `resolveQuickPayHref()` only. See `docs/e2e-feature-map.md`.

---

### Reference map (audit)

| Slice | Doc anchor                                                             |
| ----- | ---------------------------------------------------------------------- |
| AP-01 | Phase 5 § AP-01; Phase 1 step #1; `docs/amplify-deployment-runbook.md` |
| AP-03 | Phase 3 P0 #2; Phase 5 § AP-03; `paystar-quick-pay.ts`                 |
| AP-10 | Phase 4 AP-10; Phase 1 step #2                                         |
| AP-02 | Phase 3 P0 #1; Phase 5 § AP-02 Path A/B                                |
| AP-08 | Phase 4 AP-08 (Path B dependency)                                      |

Be precise, keep changes minimal and verifiable, and treat **deployed behavior** as the source of truth for AP-03/AP-10.
