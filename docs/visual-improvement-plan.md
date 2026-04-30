# Visual Improvement Plan

This plan turns the current visual audit into an incremental design-system pass for the Town of Wiley Angular site. The goal is to improve typography hierarchy, spacing rhythm, PrimeNG consistency, homepage scanability, semantic headings, and bilingual visibility without changing core resident workflows.

Use [visual-box-baseline.md](visual-box-baseline.md) as the professional "what right should look like" target for visual-box audits, screenshot review, and implementation decisions.

## Extension-Assisted Workflow

- **Angular Language Service + TypeScript Next**: use strict template diagnostics while adjusting route headings, `appCopy()` bindings, and PrimeNG templates.
- **ESLint + Prettier + Trunk**: keep TypeScript, Angular templates, JSON, Markdown, and SCSS formatted on save; use Trunk inline decorators and `trunk fmt` before validation.
- **Tailwind CSS IntelliSense**: use class linting, canonical-class suggestions, color decorators, and pixel equivalents while replacing one-off gaps and padding with the new spacing rhythm.
- **PrimeNG theme preset**: extend the existing `WILEY_THEME_PRESET` rather than introducing a competing theme; use the configured Angular/template tooling to catch binding regressions.
- **Playwright**: use locator copy, traces, responsive specs, language specs, accessibility specs, and deterministic snapshots for visual and semantic verification.
- **Error Lens + Coverage Gutters**: keep diagnostics and coverage visible while touching route templates and public-page components.
- **GitLens**: use file history/blame only when a visual pattern or route heading decision needs historical context.
- **Copilot Chat diagnostics**: keep file logging enabled so future troubleshooting can explain slow or interrupted audit sessions.
- **AWS Toolkit + Amplify extension**: keep deployment/hosting context ready, but avoid hosting changes during the visual pass unless validation requires it.

## Phase 1: Foundation

1. Formalize typography and spacing tokens in `src/app/app.scss`.
2. Add explicit line-height, section rhythm, card padding, and grid gap tokens.
3. Keep existing class names stable so templates and tests remain low-risk.
4. Extend `src/app/wiley-theme-preset.ts` to align PrimeNG surfaces, controls, cards, panels, focus rings, and dividers with the app token vocabulary.

## Phase 2: Homepage Visual Slice

1. Unify Quick Tasks and Town Features visually before attempting a full content merge.
2. Apply one shared section-header treatment, tighter divider rhythm, consistent card spacing, and cleaner grid density.
3. Preserve `#top-tasks`, `#top-tasks-heading`, and `#feature-hub-heading` so navigation and tests keep working.
4. Make the language switcher more prominent in the header while preserving `SiteLanguageService` and the `tow-site-language` localStorage key.

## Phase 3: Semantic Heading Pass

1. Audit routes from `src/app/app.routes.ts`.
2. Fix public pages that start with `h2` or `h3` without a route-level `h1`.
3. Prioritize notices, weather, meetings, records, contact, privacy, terms, accessibility, and resident services.
4. Fix the duplicate `recent-town-notices-heading` ID in `src/app/news/news.html`.
5. Leave embedded widgets at lower heading levels when they are intentionally nested under a page section.

## Phase 4: Spacing Cleanup

1. Replace high-impact arbitrary `calc(var(--spacing-unit) * X)` values with named tokens.
2. Normalize Tailwind utility gaps only where they visibly conflict with the design rhythm.
3. Start with homepage sections, then public pages, then dense weather and resident-service layouts.

## Current Status (as of 2026-04-30)

**Completed in this branch (`visual-audit-fixes-phase-4`):**

- Full visual-box audit run with pesticide-style outlines on all elements (desktop/mobile/print).
- **Fixed weather mobile tap target** (205x26px "Browse national forecast maps" link now uses `.weather-action.is-link` for 44px+ target).
- **Phase 4 spacing**: Replaced all `calc(var(--spacing-unit) * X)` with `--space-*` tokens in `app.scss` and `styles.scss` (utility links, notice/calendar cards, site alerts, main nav, etc.).
- **ngModel warning**: Added `[ngModelOptions]="{ standalone: true }"` to header search input.
- **Semantic headings (Phase 3)**: Changed resident-services `<h1>` to `<h2>` (resolves duplicate h1 on `/services` route).
- **Language toggle clipping**: Increased `min-width` (buttons to 5rem, labels to 2.25rem), added `white-space: nowrap; overflow: visible` to prevent bilingual label clipping on desktop.

**Remaining from latest audit**: None major. Language switcher and services page now pass.

**Validation Run**:

- Trunk clean.
- `npm run build` successful.
- Next: full `npm run test:e2e:smoke`, `npm run test:e2e:snapshots`, and re-audit to confirm zero issues.

## Validation

Run these after each major slice:

```sh
npm run lint
npm run build
npm run test:e2e:snapshots
```

Then run targeted checks for the changed surfaces:

```sh
npx playwright test e2e/specs/accessibility/home.a11y.spec.ts --project=desktop-chromium --workers=1
npx playwright test e2e/specs/smoke/home.language.spec.ts e2e/specs/smoke/language-public-pages.spec.ts --project=desktop-chromium --workers=1
npx playwright test e2e/specs/responsive/home.responsive.spec.ts e2e/specs/responsive/public-pages.responsive.spec.ts --workers=1
```

Manual review should cover desktop, tablet, and mobile widths in English and Spanish. Confirm that header controls do not overlap, the language switcher is visible, Spanish labels fit, focus rings are obvious, PrimeNG controls feel native to the site, and route heading trees have one clear page-level heading.

**Next Steps**: Expand spacing to remaining components (resident-services dense forms, notices, records), add visual regression snapshots, extend theme preset for more PrimeNG components, address any new audit findings. PR ready on `visual-audit-fixes-phase-4`.
