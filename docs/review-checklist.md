# Review Checklist

Expanded from the AI Coding Guide's review table, tailored for Town of Wiley website (Angular 21, AppSync, Amplify). Use for each feature/pull (e.g., after Payments/Docs). Run before merge: Logic, Security, Perf, Errors, Readability. Aim 100% pass.

## Checklist Categories

### Logic (Correctness & Edges)

- [ ] All user flows work E2E (e.g., pay success/error, upload invalid file → graceful fail).
- [ ] Edge cases handled (offline queue/sync, network 500 → retry, empty search → no results message).
- [ ] Bilingual: English/Spanish labels, forms, errors (lang switch persists, no fallback issues).
- [ ] Accessibility: WCAG AA (ARIA labels, keyboard nav, alt text if images; axe-core pass).
- [ ] Tests: 100% pass for new code (unit for services, E2E for flows; coverage >85%).

### Security (No Vulnerabilities)

- [ ] No exposed keys (proxy for Paystar/AppSync; Cognito auth for uploads).
- [ ] Input validation (file types/sizes <10MB, regex for emails/ZIP; sanitize search).
- [ ] No SQLi/XSS (AppSync IAM policies, client-side no direct queries).
- [ ] Rate limits (submissions via Lambda; no client abuse vectors).
- [ ] Scan: OWASP ZAP/npx audit (no high vulns); secrets not in git.

### Performance (Efficient & Fast)

- [ ] Lighthouse >90 (perf/accessibility; mobile <5s load).
- [ ] Queries batched/limited (AppSync first:20, pagination for lists; debounce search 300ms).
- [ ] Bundle <1MB (lazy load routes; no unused imports).
- [ ] Offline: Service Worker caches forms/lists (PWA ready).
- [ ] Metrics: <3s TTI, no N+1 (Apollo cache).

### Errors (Handled Gracefully)

- [ ] 100% covered in E2E (400 invalid card/upload, 500 server → user message + log).
- [ ] Global handler catches unhandled (no white screens; bilingual toasts).
- [ ] Logging: All errors to LOG_ENDPOINT (no sensitive data).
- [ ] Fallbacks: Proxy fail → browser/direct if allowed; offline queue.
- [ ] Bug rate=0 (rerun tests 3x, no flakiness).

### Readability (Maintainable Code)

- [ ] Angular standards (standalone, signals, OnPush, native @if/@for; no ngClass).
- [ ] Comments minimal (non-obvious only, e.g., security trade-offs).
- [ ] Consistent (match src/ patterns; SCSS PrimeNG).
- [ ] Docs: Specs updated, README progress.
- [ ] Lint: trunk check --fix pass.

## Usage

- **Per Feature**: Check after build (e.g., Payments: All [x]).
- **Full Audit**: npm run audit:done (lint + test + coverage + LHCI + ZAP).
- **Metrics Track**: Debug time <1hr/feature, bugs=0.
- **If Fail**: Fix + retest; escalate (e.g., security to AWS expert).

Run on staging before main. If 100%, merge.
