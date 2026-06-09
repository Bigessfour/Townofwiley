# Town of Wiley — Live Browser QA Audit (chrome-devtools MCP)

**Target:** https://townofwiley.gov
**Date:** 2026-06-09
**Tooling:** `chrome-devtools` MCP server (live Chrome session) + a real Lighthouse CLI run (LH 12.6.1) for cross-validation.
**Artifacts:** `docs/audit/screenshots/`, raw performance trace `docs/audit/trace.json`.

> Methodology note: console, network, responsive screenshots, the live DOM accessibility scan, and the load trace were all captured from a real browser session against production. The MCP `performance_*` trace **processor** hung after recording (a known issue), so Core Web Vitals below were extracted directly from the captured `trace.json` rather than from the (wedged) tool response. All numbers are from live data — none are estimated.

---

## Executive Verdict

The production site is **healthy, secure, and accessible**. The live session produced **zero console errors/warnings**, **zero failed network requests**, **no insecure (http://) assets**, **no horizontal-scroll/overlap bugs** at mobile or tablet, a **clean heading hierarchy**, and **excellent layout stability (CLS 0.006)**. Only three small accessibility defects were found — all now **fixed in code** (see Remediation). The one real weakness is **mobile load performance** under throttling (JS-heavy hydration), addressed by the strategy/plan at the end.

---

## 1. Network & Console Inspection

### Console
**Result: PASS — no console messages of any type** (no errors, warnings, or CSP violations) after full load + CMS hydration.

### Network — 41 requests, all successful
**Result: PASS.** Every request returned `200` (or `204` for the analytics beacon). **No 404/500. No `http://` (insecure) assets** — every resource is HTTPS.

| Type | Examples | Status |
| :--- | :--- | :--- |
| Document | `/` | 200 |
| App JS | `main-*.js` + ~30 `chunk-*.js` | 200 |
| Styles/Fonts | `styles-*.css`, `fraunces-*.woff2`, `primeicons-*.woff2` | 200 |
| Images | `hero-wiley.webp`, `mayor-steve-mckitrick.png` | 200 |
| Config/CMS | `runtime-config.js`, `cms-snapshot.json` | 200 |
| AppSync GraphQL | `…appsync-api.us-east-2.amazonaws.com/graphql` (POST ×2) | 200 |
| Lambda (weather) | `…lambda-url.us-east-2.on.aws/` | 200 |
| Analytics | `googletagmanager.com/gtag/js`, `google-analytics.com/g/collect` | 200 / 204 |

Security headers (verified separately): strict `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS `max-age=31536000; includeSubDomains; preload`.

---

## 2. Visual & Viewability Evaluation

Screenshots captured via emulated device metrics (true CSS widths, DPR 2):

**Mobile — 375 × 812**

![Mobile 375](screenshots/mobile-375-emulated.png)

**Tablet — 768 × 1024**

![Tablet 768](screenshots/tablet-768.png)

### DOM overflow analysis
| Viewport | `scrollWidth` vs `clientWidth` | Horizontal scroll? | Notes |
| :--- | :--- | :--- | :--- |
| 375 px | 375 = 375 | **No** | 2 sub-pixel offenders (hero `<img>` +2px, one `<h2>` +4px) — clipped by `overflow:hidden`, no scrollbar. |
| 768 px | 768 = 768 | **No** | 1 sub-pixel offender (hero `<img>` +4px), clipped. |

**Result: PASS — no overlapping or text clipping.** The large empty band visible on the tablet capture is the intentional `@defer` placeholder (reserved min-height) for below-the-fold sections (weather, feature hub, support), which only hydrate on scroll — this is exactly what keeps CLS near-zero.

---

## 3. Structural Accessibility Audit (live DOM)

### Heading hierarchy — PASS
Exactly one `<h1>`, sequential levels, **no skipped levels**:
```
h1  Town of Wiley
h2  How do I...
h2  Search Wiley services
h2  Council meetings & schedules
h2  News & Announcements
```

### Image alt text — 1 failure (now fixed)
| Image | Alt present? |
| :--- | :--- |
| Hero (`hero-wiley.webp`) | ✅ Yes (`appCopy().heroAlt`) |
| Mayor avatar (`mayor-steve-mckitrick.png`) | ❌ **No** — rendered by `p-avatar`; `aria-label` was on the wrapper, not the `<img>` |

Fix applied: alt is now passed onto the inner `<img>` via PrimeNG passthrough (`[pt]="{ image: { alt: … } }"`).

### Form labels — PASS
2 inputs detected, **0 unlabeled**. Search inputs have `<label class="sr-only" for=…>` + `aria-label`, inside `role="search"` forms.

### Label-in-name (WCAG 2.5.3) — 2 issues (now fixed)
The town-logo links had a visible "OFFICIAL…" status badge not contained in the link's accessible name (one link also had an English-only hard-coded `aria-label`). Fixed by marking the decorative badge `aria-hidden="true"` and making both logos use the bilingual `townLogoAriaLabel`.

---

## 4. Performance Trace (Core Web Vitals)

Extracted from the captured `trace.json` (desktop 1280×800, light throttling):

| Metric | Value | Assessment |
| :--- | :--- | :--- |
| First Contentful Paint | **1,274 ms** | Good |
| **Largest Contentful Paint** | **2,057 ms** | Good (LCP element = hero `.webp`, ~579 KiB) |
| Cumulative Layout Shift | **0.006** | Excellent (1 shift event) |
| Long tasks (>50 ms) during load | 10 | Heavy Angular/PrimeNG hydration |

**Cross-validation (Lighthouse CLI, mobile, Slow-4G + 4× CPU throttle):** Performance **50**, Accessibility **91**, Best-Practices **100**, SEO **92**; LCP 5.2 s, **TBT 1,300 ms**, CLS 0.00.

**Interpretation:** Desktop/real-network experience is good (LCP ~2 s). The mobile score is dragged down by JavaScript execution/hydration cost (TBT) and an oversized hero image on small screens — not by layout instability.

---

## 5. Pass / Fail Matrix

| Check | Status | Evidence |
| :--- | :--- | :--- |
| Console errors/warnings | ✅ Pass | 0 messages |
| Failed (404/500) requests | ✅ Pass | 41/41 OK (200/204) |
| Insecure http:// assets | ✅ Pass | None — all HTTPS |
| Mobile (375) no horizontal scroll | ✅ Pass | scrollWidth == clientWidth |
| Tablet (768) no horizontal scroll | ✅ Pass | scrollWidth == clientWidth |
| Layout overlap / text clipping | ✅ Pass | None observed |
| Heading hierarchy (h1→h6) | ✅ Pass | 1×h1, no skips |
| Image alt text | ⚠️→✅ Fixed | Mayor avatar alt added |
| Form labels | ✅ Pass | 0 unlabeled inputs |
| Label-in-name (2.5.3) | ⚠️→✅ Fixed | Badge `aria-hidden` + bilingual label |
| Color contrast (AA) | ⚠️→✅ Fixed | Buttons moved teal-600→teal-700 |
| Layout stability (CLS) | ✅ Pass | 0.006 |
| LCP | ✅ Pass (desktop) | 2.06 s |
| Mobile performance | ⚠️ Improve | LH 50; see plan |

---

## 6. Remediation — Implemented in This Pass

All in `src/app/app.html`:

1. **Mayor avatar alt** — `p-avatar` now sets `alt` on the rendered `<img>` via `[pt]="{ image: { alt: appCopy().footerAttestationPhotoAlt } }"`. (Fixes `image-alt` failure in axe/Lighthouse + SEO.)
2. **Button contrast** — hero primary CTA and search-submit button changed `bg-wiley-teal-600` (#0d9488, 3.74:1) → `bg-wiley-teal-700` (#0f766e, ~5.5:1), hover → `teal-800`. (Fixes `color-contrast`.)
3. **Label-in-name** — decorative status badge on both town-logo links is now `aria-hidden="true"`; the desktop logo now uses the bilingual `townLogoAriaLabel` instead of a hard-coded English string. (Fixes `label-content-name-mismatch`.)

Expected effect: Lighthouse Accessibility **91 → ~100**, and removal of the only Best-Practices/SEO a11y deductions.

---

## 7. Strategy / Plan — Mobile Performance (remaining)

Prioritized, lowest-risk first:

**P1 — Image delivery (biggest LCP/byte win, ~330 KiB).**
- Generate responsive `srcset`/sizes for the hero (`hero-wiley.webp`) so phones don't download the full ~579 KiB; serve AVIF with WebP fallback. Hero already uses `NgOptimizedImage` + `priority` — add width-based derivatives.
- Apply the same to notice/news/business images (already `NgOptimizedImage`; add `sizes`).

**P2 — JavaScript weight / main-thread (TBT 1,300 ms).**
- Audit PrimeNG imports; ensure only used modules ship. Continue route-level/`@defer` lazy loading (already used for weather/feature-hub/support — extend to the chat FAB and any non-critical homepage widgets).
- Ship modern-only JS (drop legacy/differential polyfills) — Lighthouse flagged "legacy JavaScript to modern browsers".

**P3 — Edge/CDN config (infra, no code).**
- Enable Brotli/gzip text compression at CloudFront ("Enable text compression", ~13 KiB).
- Re-evaluate the document `Cache-Control: no-cache, no-store, must-revalidate` on `/` — `no-store` disqualifies back/forward-cache (Lighthouse: "page prevented bfcache"). Consider `no-cache` without `no-store` for the HTML so bfcache + conditional revalidation work.

**P4 — Best Practices polish.**
- Enable production source maps (`sourceMap: true`) so error monitoring gets readable stack traces (clears `valid-source-maps`).

**P5 — Content (CMS, via `/admin`, not code).**
- Publish at least one current Public Notice (live `cms-snapshot.json` shows `noticeRecords: []`).
- Re-save the document title `City Council Meeting â Agenda (June 8, 2026)` — the `â` is a corrupted em-dash (UTF-8 mojibake).
- Populate `LeadershipRosterEntry` so the Contact page roster renders.

---

## Appendix — Raw Logs

**Console:** `<no console messages found>`

**Network (selected):**
```
GET  /                                   200  document
GET  main-PXKQ3NRG.js                     200  script
GET  styles-WUXVSLKV.css                  200  stylesheet
GET  hero-wiley.webp                      200  image   (LCP element, ~579 KiB)
GET  mayor-steve-mckitrick.png            200  image
GET  runtime-config.js?ngsw-bypass        200  script
GET  cms-snapshot.json                    200  fetch
POST …appsync-api…/graphql                200  fetch   (×2)
GET  …lambda-url…on.aws/                   200  fetch   (weather)
GET  googletagmanager.com/gtag/js         200  script
POST google-analytics.com/g/collect       204  ping
```
(41 total requests; full list in the live session.)
