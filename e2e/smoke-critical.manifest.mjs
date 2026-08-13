/**
 * PR / post-deploy critical smoke tier (local ng serve).
 * Full folder: e2e/specs/smoke via `test:e2e:smoke:full` or `test:e2e:regression`.
 */
export const smokeCriticalGlobs = [
  'smoke/home.smoke.spec.ts',
  'smoke/csp-homepage.spec.ts',
  'smoke/public-route-health.spec.ts',
  'smoke/not-found-nav.spec.ts',
  'smoke/payments.spec.ts',
  'smoke/global-error-handler.spec.ts',
  'smoke/documents-cms.spec.ts',
  'smoke/admin.cms.spec.ts',
  'smoke/forms-and-empty-states.spec.ts',
  'smoke/community-calendar.spec.ts',
  'smoke/news.interactions.spec.ts',
];
