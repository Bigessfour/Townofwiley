# Town of Wiley Website — Technical Evaluation

**Prepared for:** Mayor and Town leadership  
**Date:** October 21, 2026  
**Scope:** Analysis only — no code changes, no new features  
**Live site reviewed:** [https://www.townofwiley.gov](https://www.townofwiley.gov) (read-only checks)

> **Closeout:** Implementation status for the prioritized actions is tracked in [site-evaluation-2026-10-21-status.md](./site-evaluation-2026-10-21-status.md) (Waves 1–2 + `app.ts` Phases 0–5).

---

## Executive summary (plain language)

The Town’s website is built on a **modern, well-maintained technology stack** (current-generation Angular, hosted on **Amazon Web Services** with automated testing before each production update). For residents, it already delivers **strong speed and usability** on desktop (Lighthouse performance ~91/100) and includes **bilingual English/Spanish**, a **staff content editor**, weather and payments integrations, and **security headers** appropriate for a government site.

The biggest opportunities are not “start over,” but **sharpen what you already have**:

1. **Make accessibility checks part of every release** — Automated tests exist but do not run in the main GitHub pipeline; Lighthouse still flags contrast, labels, and some images on the live homepage. For ADA Title II and Colorado HB21-1110, closing this gap is the highest-value compliance move.
2. **Reduce the size of the first page download** — The production build warns that the initial JavaScript bundle is ~**2.5 MB** (budget warning at 2.1 MB). That affects mobile users and slower connections even when scores look good.
3. **Keep search engines aligned with the real site map** — `sitemap.xml` is missing several public pages (e.g. weather, pay bill, news, accessibility) and uses **stale last-modified dates**; `/documents` is listed but redirects to meetings.
4. **Unify written AWS/account documentation** — Multiple files disagree on which AWS account is “canonical” (`570912405222` vs `818904800844`). Deploy workflows match the **818…** official Town account in `infrastructure/aws-infrastructure.manifest.json`; older agent rules still cite **570…**. This is an **IT succession and audit risk**, not a resident-facing bug.
5. **Plan incremental hardening of content security policy (CSP)** — Production already sends CSP, HSTS, and frame denial, but allows `'unsafe-inline'` scripts and styles (documented tradeoff for Google Analytics and Angular). A long-term plan to tighten this reduces XSS risk without blocking analytics.

---

## What we verified in this evaluation

| Check | Result |
|--------|--------|
| `npm run lint` | Pass |
| `npm run test:vitest` | Pass |
| `npm run test:unit:browser` | Pass (107 tests) after installing Playwright Chromium locally |
| `npm run build:ci` | Pass with **budget warnings** (initial bundle, `app.scss` size) |
| `npm audit --audit-level=critical` | Pass (0 critical; 32 total issues mostly in **dev-only** tools) |
| Lighthouse (desktop) on production | Performance 91, Accessibility 92, Best practices 96, SEO 92 |
| Key URLs HTTP status | 200 for `/`, `/weather`, `/accessibility`, `/history` |
| Playwright E2E / axe suite in CI | **Not run** (see “Could not verify”) |

---

## Stack and architecture (reference)

| Area | Evidence |
|------|----------|
| Framework | Angular **22.2.2**, standalone components, signals, OnPush, native `@if`/`@for` (no `*ngIf` / `ngClass` in `src/`) |
| UI | PrimeNG 22, Tailwind 4, SCSS design tokens |
| CMS | AWS AppSync GraphQL; public reads via API key in `runtime-config.js`; staff `/admin` via Cognito |
| Hosting | S3 + CloudFront (Amplify Hosting decommissioned June 2026 per `docs/DEPLOYMENT_SSOT.md`) |
| Build | Static prerender (**12 routes**), service worker (`ngsw-config.json`), `outputMode: "static"` in `angular.json` |
| CI/CD | `.github/workflows/ci.yml` → `site-ci.yml`: lint, unit tests, Vitest, production build, **critical-only** audit, auto-deploy on `main` |
| Node | **24.16.0** (`.nvmrc`, CI); cloud agent default shell had Node 22 until repo setup script |

---

## Findings by area

### 1. Framework fit and upgrade risk

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **Low** | Stack is **current** and idiomatic for Angular 22 (lazy routes, `provideRouter`, hydration). | `package.json` L177–201; `src/app/app.routes.ts` L6–80; zero `NgModule`/`*ngIf` matches in `src/` | Stay on patch releases; batch Angular/PrimeNG bumps with CI green | **Small** (ongoing) |
| **Medium** | **Home shell is a single 3,372-line component** — harder to change safely. | `src/app/app.ts` (line count); homepage template `src/app/app.html` L515–529 | Incrementally extract feature sections into standalone components (no behavior change) | **Large** |
| **Low** | Docs still say “Angular 21” in places while `package.json` pins **22.2.2**. | `docs/NODE_VERSION.md` L7; `package.json` L178 | Editorial sync in docs/rules only | **Small** |
| **Low** | Build emits **budget warnings** (not failures). | `angular.json` L58–68; build log: initial **2.53 MB** vs 2.1 MB warning; `app.scss` **69.56 kB** vs 64 kB warning | Trim global styles or raise budgets only after bundle analysis | **Medium** |

### 2. Performance and Core Web Vitals

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **Medium** | **Large initial JS** (`main-*.js` ~1.29 MB raw; total initial ~2.53 MB). | Build output; `dist/.../browser/main-*.js` size | Lazy-load PrimeNG/home-only modules; split `app.ts`; run `npm run build:stats` / `analyze:bundle` | **Large** |
| **Medium** | Prerendered **`index.html` ~426 KB** (inlined CSS). | `dist/townofwiley-app/browser/index.html` byte count; live `content-length: 426305` | Review prerender/CSS inlining strategy with Angular build team | **Medium** |
| **Low** | Hero uses **WebP** on live site; legacy **1 MB JPG** remains in `public/`. | Live HTML grep `hero-wiley.webp`; `public/hero-wiley.jpg` size; `app.html` L522–528 `ngSrc` + `priority` | Ensure CMS/default URLs never point at JPG; optional remove unused JPG from deploy | **Small** |
| **Low** | **Good** live desktop vitals in Lighthouse: LCP **1.6 s**, CLS **0.015**, TBT **140 ms**. | Lighthouse run 2026-10-21 | Monitor after bundle changes; add mobile Lighthouse to release checklist | **Small** |
| **Low** | Caching: long-cache hashed JS/CSS; `no-cache` HTML/`runtime-config.js`. | `customHttp.yml` L34–69; live response headers | Keep; verify CloudFront behaviors match SSOT after infra changes | **Small** |

**Could not verify:** Mobile Lighthouse run failed to parse JSON in this environment; desktop scores used instead.

### 3. Accessibility (WCAG 2.1 AA / ADA / HB21-1110)

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **High** | **Axe-based E2E tests are not in Site CI** — only local/`test:e2e:regression`. | `.github/workflows/site-ci.yml` L1–3 comment; jobs stop at unit/Vitest/build | Add a **smoke subset** of `e2e/specs/accessibility` to CI or scheduled workflow | **Medium** |
| **Medium** | Lighthouse accessibility **92** with failures: **color-contrast**, **image-alt**, **label-content-name-mismatch**, **aria-allowed-role**. | Lighthouse 2026-10-21 on production | Triage with axe locally; fix Town-controlled UI; document third-party (GTM) exceptions | **Medium** |
| **Low** | Repo **disables some axe rules** for PrimeNG quirks. | `e2e/specs/accessibility/home.a11y.spec.ts` L37–38 | Re-enable when upstream fixes land; track in accessibility statement | **Small** |
| **Low** | Dedicated **`/accessibility`** page and mailto-based barrier report form. | `src/app/accessibility-page/`; `accessibility-support.ts` L182–228 | Keep contact paths current in CMS; optional future server-side intake | **Small** |
| **Low** | **Spanish** toggles `lang` on `<html>` client-side. | `src/app/site-language.ts` L20–27 | Consider `hreflang` only if you add separate URLs per language | **Small** |

Staff clerk UI is **English-only** by design (`AGENTS.md`) — acceptable if public site stays bilingual.

### 4. SEO, metadata, and mobile

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **Medium** | **Sitemap incomplete / stale** — missing `/weather`, `/pay-bill`, `/news`, `/accessibility`; `/documents` redirects to meetings. | `public/sitemap.xml` L1–62 vs `src/app/app.routes.ts` routes | Regenerate sitemap from route list; fix `/documents` entry | **Small** |
| **Low** | Base meta + per-route updates via `Title`/`Meta` in app shell. | `src/index.html` L4–19; `src/app/app.ts` ~L2344–2351 | Ensure every lazy route sets title/description (audit route effects) | **Medium** |
| **Low** | `robots.txt` allows crawl + sitemap URL. | `public/robots.txt` L1–4 | None required | **Small** |
| **Low** | Responsive E2E exists (`e2e/specs/responsive/`) but **not in CI**. | `e2e/specs/responsive/*.spec.ts` | Spot-check mobile in CI smoke or quarterly manual | **Medium** |
| **Low** | Apple touch icon still **SVG** (iOS prefers PNG). | `src/index.html` L13–14 | Add 180×180 PNG when convenient | **Small** |

### 5. Security

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **Medium** | CSP allows **`'unsafe-inline'`** for scripts and styles (GA + Angular inline CSS). | `customHttp.yml` L22–33; live `content-security-policy` header | Document accepted risk; roadmap nonces/hashes where hosting allows | **Large** |
| **Low** | **Strong baseline headers**: HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer policy. | Live `curl -I` 2026-10-21 | Maintain parity via `customHttp.yml` SSOT checks (`verify:custom-http-yaml`) | **Small** |
| **Low** | **AppSync API key** exposed in public `runtime-config.js` — **expected** for read-only public CMS; writes require Cognito. | `public/runtime-config.js` L30–36; `amplify-config.ts` L91–92 | Rotate keys on schedule; WAF on AppSync (`deploy:appsync-waf` scripts) | **Small** (ops) |
| **Low** | `npm audit`: **0 critical** in CI gate; **20 high** mostly in **dev** chains (`web-codegen-scorer`, `@lhci/cli`, `vite` via `@angular/build`). | `npm audit` 2026-10-21; `package.json` L233 comment | Update dev deps; avoid `audit fix --force` without testing | **Medium** |
| **Low** | No obvious committed AWS access keys in quick scans; secrets via `npm run secrets:*`. | Project conventions `AGENTS.md` | Periodic secret scan in CI (already patterns in repo scripts) | **Small** |

Accessibility report form uses **mailto:** (no server storage) — low data-breach surface, depends on resident email client.

### 6. Code quality and maintainability

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **Medium** | **`site-cms-content.ts` ~2,353 lines** plus monolithic `app.ts`. | Line counts | Continue CMS patterns; extract pure helpers already started in features | **Large** |
| **Low** | Lint clean; ESLint flat-config migration note (`.eslintignore` deprecated). | `npm run lint` output | Move ignores to `eslint.config.js` | **Small** |
| **Low** | Rich test pyramid: **107** unit tests, many Playwright specs, Vitest for scripts. | `test:unit:browser` output; `e2e/specs/**` | Wire critical smoke into CI | **Medium** |
| **Medium** | **Conflicting AWS account SSOT** for agents vs production manifest. | `infrastructure/town-aws-account.json` L5 `570912405222`; `infrastructure/aws-infrastructure.manifest.json` L5 `818904800844`; `site-ci.yml` L134 role in **818…** | Single documented source; update `.cursor/rules` and `town-aws-account.json` or mark legacy | **Medium** |

### 7. Deploy and reliability

| Severity | Finding | Evidence | Recommended fix | Effort |
|----------|---------|----------|-----------------|--------|
| **Low** | **Documented production path** works: merge to `main` → Site CI → S3 sync → CloudFront invalidation → smoke curls. | `docs/DEPLOYMENT_SSOT.md` L7–11; `site-ci.yml` L107–154 | Keep branch protection on `site-ci / CI gate` | **Small** |
| **Medium** | **E2E and live CSP probes not on every PR** — post-deploy CSP probe on `main` only. | `site-ci.yml` L153–154; E2E not in workflow | Optional: `test:e2e:live:production` on schedule | **Medium** |
| **Low** | CMS public updates via CDN snapshot (~1 min) — documented clerk expectation. | `AGENTS.md` client-side caching section | Operational training only | **Small** |
| **Low** | Dual-account backend (CMS/Lambdas migration) increases operational complexity. | `docs/AWS_INFRASTRUCTURE_SOT.md` L5–7 | Track `infrastructure/migration/tow-account-818904800844/CUTOVER-STATUS.md` | **Medium** (IT) |

---

## Prioritized action list

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| 1 | Add **accessibility smoke** (axe) to CI or weekly scheduled GitHub Action | IT / vendor | Medium |
| 2 | **Bundle analysis** and phased split of `app.ts` / defer non-critical PrimeNG on first paint | IT / vendor | Large |
| 3 | **Refresh `sitemap.xml`** to match live routes and redirects | Clerk / IT | Small |
| 4 | **Reconcile AWS account documentation** (570 vs 818) for staff and agents | IT | Medium |
| 5 | Triage Lighthouse **contrast / labels / alt** on production; fix Town-controlled UI | IT / vendor | Medium |
| 6 | Update **dev dependencies** tied to `npm audit` highs without breaking Angular 22 pin | IT | Medium |
| 7 | Optional: **PNG apple-touch-icon**; remove unused **hero JPG** from deploy | IT | Small |
| 8 | Long-term: **CSP tightening** plan (analytics + inline styles) | IT / security review | Large |

---

## Could not verify (limitations)

- **Full Playwright E2E** (`npm run test:e2e:smoke`) — not executed in this run (requires dev server + time; not part of Site CI today).
- **Mobile Lighthouse** — CLI output did not parse successfully here; desktop Lighthouse used.
- **AWS live infrastructure** — no mutating AWS CLI against Town accounts in this analysis-only task.
- **Manual keyboard audit** of every widget — inferred from automated tests and code patterns, not hands-on retest of all flows.
- **Content accuracy** (meeting dates, legal copy) — out of scope; CMS/process only.

---

## Appendix: Commands run (reproducibility)

```bash
export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
cd /workspace
npm ci
npm run lint
npm run test:vitest
npx playwright install chromium
npm run test:unit:browser
npm run build:ci
npm audit
npm audit --audit-level=critical
npx lighthouse https://www.townofwiley.gov --only-categories=performance,accessibility,best-practices,seo --preset=desktop
```

---

*This report describes the repository and live site as observed on October 21, 2026. It is not a legal ADA certification.*
