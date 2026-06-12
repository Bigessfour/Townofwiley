---
name: copy
description: >-
  Sync Town of Wiley user-facing copy across APP_COPY, e2e fixtures, megamenu
  tests, site-monitor markers, and docs after menu or feature label changes.
  Use when the user invokes /copy or when updating mega menu labels, search
  strings, bilingual text, or deprecating route/page copy.
disable-model-invocation: true
---

# /copy — Town of Wiley copy sync

Keep **one source of truth** for English UI strings and mirror it everywhere tests and ops read copy.

## Source of truth

| Priority | Location | Notes |
|----------|----------|--------|
| 1 | `src/app/app.ts` → `APP_COPY.en` / `APP_COPY.es` | Bilingual public copy, `menuItems()`, search, feature titles |
| 2 | `src/app/app.ts` → `menuItems()` computed | Mega menu links; labels must match `APP_COPY` fields |
| 3 | `e2e/support/site-content.ts` | EN-only mirrors for Playwright (`megaMenuPanelLinksEn`, `megaMenuRootLabelsEn`, chrome) |
| 4 | `src/app/app.spec.ts` | Unit expectations for `menuItems()` shape |
| 5 | `e2e/specs/smoke/megamenu-*.spec.ts` | Clicks by label from `site-content.ts` |
| 6 | `infrastructure/site-monitor/app.py` | `DEFAULT_PUBLIC_PAGE_MARKERS` (reference; SPA probes HTTP 200 today) |
| 7 | `docs/SITE_INTERACTION_INVENTORY_AND_TESTING.md`, checklists | Route lists and interaction inventory |

## Workflow

1. **Identify the change** — menu label, feature title, search string, redirect destination copy, or deprecated route.
2. **Edit `APP_COPY`** (EN + ES when the string is user-facing on the public site).
3. **Update `menuItems()`** if the mega menu or mobile drawer labels/paths changed.
4. **Sync `e2e/support/site-content.ts`** — every key in `megaMenuPanelLinksEn` must match a live panel label; remove keys for removed links (e.g. no mega menu `Permits & Licenses` after simplification).
5. **Grep for stale strings**:
   ```bash
   rg -n "Records and documents|Public Document Hub|recordsAndDocuments|permitsAndLicenses|guidePackets|leadership-grid" e2e src docs infrastructure
   ```
6. **Update tests** — megamenu specs, `public-routes.ts`, inventory IDs in `interaction-inventory.ts`, site-monitor fake HTML in `test_app.py`.
7. **Run**:
   ```bash
   npm run test:unit:browser -- src/app/app.spec.ts
   npx playwright test e2e/specs/smoke/megamenu-internal-links.spec.ts e2e/specs/smoke/megamenu-chrome-and-roots.spec.ts --project=desktop-chromium --workers=1
   python3 -m unittest infrastructure/site-monitor/tests/test_app.py
   ```

## Current routing copy (June 2026 simplification)

| Old concept | Public behavior | Mega menu label |
|-------------|-----------------|-----------------|
| Records center / `/records` | Redirect → `/contact` + clerk callout | — (no dedicated hub link) |
| Document hub / `/documents` | Redirect → `/meetings` archive | **Meetings & documents** → `/meetings` |
| Permits in Services mega menu | Removed from panel | `/permits` page still exists; clerk via contact |

Do **not** reintroduce `Records and documents`, `Public Document Hub`, or mega menu **Permits & Licenses** panel links unless product explicitly restores those flows.

## Checklist before finishing

- [ ] EN and ES updated in `APP_COPY` when UI shows the string
- [ ] `site-content.ts` matches `menuItems()` panel labels exactly
- [ ] No orphaned e2e keys (`permitsAndLicenses`, `recordsAndDocuments`, etc.)
- [ ] Megamenu tests assert destination elements that still exist (not removed CSS classes)
- [ ] Site-monitor markers/docs no longer reference document hub or records center pages
- [ ] `interaction-inventory.ts` IDs match test titles in `e2e/specs/inventory/`
