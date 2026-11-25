# Site evaluation closeout — 2026-10-21

**Source report:** [site-evaluation-2026-10-21.md](./site-evaluation-2026-10-21.md)  
**Closeout date:** 2026-10-22  
**Repo HEAD at closeout:** see git history for this file / Wave PRs `#170`–`#178`

This tracks the prioritized action list from the October 21 technical evaluation against what shipped afterward.

---

## Prioritized actions

| # | Action | Status | Evidence |
|---|--------|--------|----------|
| 1 | Accessibility smoke (axe) in CI or weekly Action | **Done** | `.github/workflows/a11y-weekly.yml`; `e2e/specs/accessibility/a11y-smoke.spec.ts`; PR `#172` |
| 2 | Bundle analysis + phased `app.ts` split | **Done** (phased split); further PrimeNG lazy-load optional | Phases 0–5 PRs `#173`–`#178`; `app.ts` ~3,376 → **758** lines; `build:ci` initial total **~1.82 MB** (was ~2.53 MB; under 2.1 MB warning) |
| 3 | Refresh `sitemap.xml` | **Done** | PR `#171`; live routes include `/weather`, `/pay-bill`, `/news`, `/accessibility`; stale `/documents` removed |
| 4 | Reconcile AWS account SSOT (570 vs 818) | **Done** | PR `#171`; `infrastructure/town-aws-account.json` official **818…** / profile **`tow`**; Gen1 **570…** marked legacy |
| 5 | Triage Lighthouse contrast / labels / alt | **Done** (Town-controlled homepage) | PR `#172` homepage a11y fixes + weekly smoke; re-audit live Lighthouse after next content change if needed |
| 6 | Update dev deps for `npm audit` highs without breaking Angular 22 | **Partial** | Vitest **5.0.5** patch applied (browser `server.fs.deny` advisory). Remaining **highs** are mostly **dev-only** (`web-codegen-scorer`, `@lhci/cli`, Vite via `@angular/build`). CI still gates **critical-only**. Avoid `npm audit fix --force`. |
| 7 | PNG apple-touch-icon; remove unused hero JPG | **Done** | PR `#171`; `public/apple-touch-icon.png`; `hero-wiley.jpg` removed from deploy |
| 8 | Long-term CSP tightening | **Documented / deferred** | Accepted risk + roadmap already in `customHttp.yml` comments and `docs/third-party-csp-registry.md` (nonces/hashes when hosting supports them) |

---

## Other evaluation findings (non-priority table)

| Finding | Status | Notes |
|---------|--------|-------|
| Docs saying “Angular 21” | **Done** | Synced in Wave 1 doc pass |
| Build budget warnings (initial JS / `app.scss`) | **Improved** | Initial JS under warning after split; keep monitoring `build:ci` |
| Large prerendered `index.html` | **Open / medium** | Needs Angular inlining strategy review; not blocking |
| Responsive E2E not in Site CI | **Deferred (low)** | Suite exists under `e2e/specs/responsive/`; weekly a11y chosen to keep PR CI fast |
| `.eslintignore` deprecated | **Done** | Removed; ignores live in `eslint.config.js` |
| `site-cms-content.ts` ~2.3k lines | **Open / large** | Separate extract track; not part of `app.ts` Phases 0–5 |
| Mobile Lighthouse | **Ops** | Add to release checklist when convenient |
| AppSync API key rotation / WAF | **Ops** | Existing runbooks; not code-blocked |

---

## Verification commands (local)

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
npm run lint
npm run test:vitest
npm run build:ci
npm run rag:index   # after large doc/code changes
npm run rag:status
```

---

## Intentionally not force-fixed

- **`npm audit fix --force`** — would pull breaking `@lhci/cli` / `web-codegen-scorer` / `@angular/build` pins.
- **CSP nonce migration** — blocked on static hosting response pipeline; tracked in CSP registry.
- **Full CMS store split** — separate program of work from the home-shell split.
