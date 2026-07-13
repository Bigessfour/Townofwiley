import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCiFailureFacts } from './lib/ci-failure-facts.mjs';

test('extractCiFailureFacts finds ESLint file:line errors', () => {
  const raw = `
##[error]  918:33  error  Array type using 'Array<T>' is forbidden. Use 'T[]' instead  @typescript-eslint/array-type
src/app/site-cms-content.ts
  918:33  error  Array type using 'Array<T>' is forbidden. Use 'T[]' instead  @typescript-eslint/array-type
`;
  const facts = extractCiFailureFacts(raw);
  assert.equal(facts.eslintErrors.length, 1);
  assert.match(facts.summary, /ESLint error/);
  assert.ok(facts.failingJobs.includes('frontend-lint-build'));
  assert.equal(facts.confidence, 'high');
  assert.equal(facts.fastPathEligible, true);
  assert.equal(facts.actionable.category, 'eslint');
  assert.ok(facts.actionable.verifyCommands.includes('npm run lint'));
});

test('extractCiFailureFacts finds Playwright and build signatures', () => {
  const raw = `
Error: expect(locator).toBeVisible() failed
  at e2e/specs/smoke/home.spec.ts:42
Strict runtime config: missing required production environment variables:
  - APPSYNC_CMS_API_KEY
`;
  const facts = extractCiFailureFacts(raw);
  assert.ok(facts.playwrightFailures.length >= 1);
  assert.ok(facts.buildErrors.length >= 1);
  assert.ok(facts.failingJobs.includes('frontend-smoke') || facts.failingJobs.includes('frontend-lint-build'));
});

test('extractCiFailureFacts unit-test admin runtime signature is fast-path eligible', () => {
  const raw = `
 FAIL   townofwiley-app (chromium)  src/app/app.spec.ts > App > should render the clerk editor
Error: Admin runtime config failed to load.
`;
  const facts = extractCiFailureFacts(raw);
  assert.equal(facts.actionable.category, 'unit-tests');
  assert.equal(facts.fastPathEligible, true);
});