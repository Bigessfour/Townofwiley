# Angular 21 + PrimeNG + AWS Amplify Page Readiness Checklist

This document is the canonical reference for building and reviewing production-ready pages in the Town of Wiley site. It focuses on practical quality: the page should load reliably, look professional, be accessible, and function as designed.

---

## 1) Target Architecture (What "Good" Looks Like)

### Frontend Stack

- **Angular 21** standalone components, signals-first patterns, `OnPush` change detection.
- **PrimeNG** for UI components (cards, forms, menus, dialogs, tables, etc.).
- **SCSS + design tokens** for consistent spacing, typography, color, and motion.
- **Angular Router** with lazy-loaded feature routes and route-level split points.

### Hosting and Delivery

- **AWS Amplify Hosting** serves the built Angular app as static assets from a global CDN.
- Browser requests load `index.html`, JavaScript chunks, and assets from Amplify.
- For client-side routes (for example `/services`, `/news`, `/weather`), Amplify rewrite rules must return `index.html` so Angular router can render the right page.
- Runtime/API actions are handled by backend services (for example AWS API endpoints), not by Amplify itself.

### Data/Action Flow (Typical)

1. User loads route.
2. Angular initializes page shell and route component.
3. Component/service reads runtime config and requests data.
4. Backend endpoints (for example weather proxy, CMS GraphQL, signup APIs) return data.
5. UI renders success, empty, loading, and error states clearly.
6. User actions (submit forms, navigate, filter) trigger validated requests and user feedback.

---

## 2) Canonical Page Structure (Reference Blueprint)

Use this structure for every major page:

1. **Route entry**
   - Lazy-loaded route definition.
   - Route metadata (title/description where applicable).

2. **Page shell**
   - Semantic container (`main`, `section`, headings in correct order).
   - Localized text from approved copy source.

3. **Feature sections**
   - Hero/summary section (if needed).
   - Primary action area.
   - Data-driven content section(s) with clear loading and empty states.

4. **Interaction layer**
   - Forms/buttons/links with correct types, labels, and keyboard behavior.
   - PrimeNG component configs aligned with accessibility and tone.

5. **State and services**
   - Signals/computed for UI state.
   - Service calls with typed responses and error handling.

6. **Styling layer**
   - SCSS scoped to component.
   - Tokens and utility patterns reused; avoid ad-hoc one-off styles.

7. **Tests**
   - Unit tests for key render/logic behavior.
   - E2E smoke for user-critical flows.

---

## 3) AWS Amplify Hosting Checklist

Use this to verify Amplify is correctly hosting and routing the Angular app.

### Build and Deploy

- [ ] Amplify build uses the correct Node/npm versions for Angular 21 project requirements.
- [ ] Build command succeeds (`ng build`) with no blocking errors.
- [ ] Output artifact path points to Angular build output directory.
- [ ] Environment variables/runtime config are present for target environment (dev/staging/prod).

### SPA Routing and Rewrites

- [ ] Rewrite rule routes unknown paths to `index.html` (SPA behavior).
- [ ] Known asset paths (`/assets`, JS chunks, CSS) are not rewritten incorrectly.
- [ ] Deep links (open route directly in browser) work: `/services`, `/news`, `/weather`, `/admin`.

### Performance and Delivery

- [ ] Compression and CDN caching are active for static assets.
- [ ] Cache invalidation strategy is reliable on deploy.
- [ ] No missing chunk errors after deployment or refresh.

### Security and Headers

- [ ] HTTPS enforced.
- [ ] Security headers validated (CSP/HSTS/X-Content-Type-Options/etc. per project policy).
- [ ] No secrets exposed in bundled client files.

---

## 4) Angular 21 Implementation Checklist

### Component and State Patterns

- [ ] Page uses standalone component architecture.
- [ ] Inputs/outputs/signals follow Angular 21 conventions.
- [ ] `OnPush` change detection is used for page/component tree where expected.
- [ ] No unnecessary two-way binding when signal/reactive state is sufficient.

### Template Quality

- [ ] Native control flow (`@if`, `@for`, `@switch`) used consistently.
- [ ] `@for` uses stable unique tracking keys (not fragile display text).
- [ ] Semantic HTML: one `h1`, proper heading hierarchy, landmark regions.
- [ ] Links are links, buttons are buttons (correct semantics).

### Deferred/Performance Patterns

- [ ] Below-the-fold sections use `@defer` where beneficial.
- [ ] `@placeholder` and layout reservation prevent visual jump/CLS.
- [ ] Critical content appears without waiting for non-critical sections.

### Routing and Navigation

- [ ] Route works via in-app navigation and direct URL load.
- [ ] Query params/fragments behave as intended.
- [ ] Back/forward browser navigation is stable.

---

## 5) PrimeNG Usage Checklist

### Component Use

- [ ] PrimeNG components are used as presentation and interaction building blocks, not as inaccessible wrappers.
- [ ] Component APIs are used intentionally (templates, slots, pt/styleClass, etc.).
- [ ] No unnecessary deep overrides when a standard class/style API can solve it.

### Accessibility and UX

- [ ] Interactive PrimeNG components are keyboard-usable.
- [ ] Focus styles are visible and consistent.
- [ ] Names/labels are programmatically determinable (`aria-labelledby`/labels where needed).
- [ ] Color contrast and text readability meet WCAG AA expectations.

### Visual Quality

- [ ] Spacing, typography, and elevation match site system.
- [ ] Cards/panels/forms look consistent across pages.
- [ ] Page does not look "default template" or mismatched across components.

---

## 6) Content, UX, and "Professional Finish" Checklist

### Content Integrity

- [ ] All visible copy is intentional, reviewed, and localized where required.
- [ ] No placeholder text, debug text, or dead links.
- [ ] Empty/error states are human-readable and helpful.

### Interaction Quality

- [ ] Every primary action has clear success/failure feedback.
- [ ] Forms validate input before submit and show actionable errors.
- [ ] Loading indicators exist for async operations.
- [ ] No double-submit or race-condition behavior in common actions.

### Visual Polish

- [ ] Consistent page rhythm (spacing, section headers, card density).
- [ ] Responsive behavior verified on desktop/tablet/mobile breakpoints.
- [ ] No clipping, overflow, or broken wrapping with long text (including Spanish).
- [ ] Hover/focus/active states feel intentional and consistent.

---

## 7) Data and Backend Action Checklist

### API Contracts

- [ ] Requests and responses are typed.
- [ ] Error payloads are handled gracefully.
- [ ] Timeouts/failures do not crash the page.

### Runtime Config and Environment Safety

- [ ] Runtime config defaults are sane when optional values are absent.
- [ ] Environment-specific endpoints are correct (local/staging/prod).
- [ ] No hard-coded secrets or privileged tokens in client code.

### Critical Actions

- [ ] User-triggered actions (signup, submit, update, fetch) are idempotent or guarded.
- [ ] Server failures show user-safe messages.
- [ ] Observability/logging hooks exist for key failures where appropriate.

---

## 8) Testing and Quality Gate Checklist

### Required Validation Before Marking "Complete"

- [ ] Unit tests added/updated for core page behavior.
- [ ] E2E smoke covers critical user journey(s) on that page.
- [ ] Lint/format/type checks pass.
- [ ] Build succeeds in CI and deployment environment.

### Recommended Validation

- [ ] Manual keyboard-only pass.
- [ ] Manual screen reader sanity pass for key interactions.
- [ ] Quick performance sanity (LCP/CLS regressions avoided).
- [ ] Browser sanity in Chrome + Safari (and mobile viewport).

---

## 9) Definition of Done (Page-Level)

A page is complete when all conditions are true:

1. **Functional**
   - All planned content and actions work in real navigation flows.
2. **Reliable**
   - Handles loading, empty, and error states without breaking.
3. **Accessible**
   - Keyboard/screen-reader basics and contrast meet project standards.
4. **Professional UI**
   - Consistent visual system, responsive behavior, no obvious rough edges.
5. **Deployable**
   - Passes tests/checks and works correctly behind Amplify routing/hosting.

If any one category fails, the page is not done.

---

## 10) Practical Review Template (Copy/Paste)

Use this in PRs or release checks:

- **Page:** `<route/path>`
- **Owner:** `<name>`
- **Date:** `<yyyy-mm-dd>`

### Completion Checklist

- [ ] Architecture and route structure follow Angular 21 conventions.
- [ ] PrimeNG components are accessible and consistently styled.
- [ ] Amplify routing/rewrite and deep-link behavior verified.
- [ ] All data calls and user actions are validated end-to-end.
- [ ] Unit + smoke tests updated and passing.
- [ ] Responsive/accessibility manual checks completed.
- [ ] Visual quality is consistent with the rest of the site.

### Risks / Follow-ups

- `<none>` or list specific known follow-ups.

---

## 11) Source Documentation (Authoritative References)

- Angular deferred views: [https://angular.dev/guide/templates/defer](https://angular.dev/guide/templates/defer)
- Angular routing and standalone APIs: [https://angular.dev](https://angular.dev)
- PrimeNG component docs: [https://primeng.org](https://primeng.org)
- PrimeNG accessibility guidance: [https://primeng.org/guides/accessibility](https://primeng.org/guides/accessibility)
- AWS Amplify Hosting docs: [https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html)
- AWS Amplify redirects/rewrites for SPAs: [https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html)
