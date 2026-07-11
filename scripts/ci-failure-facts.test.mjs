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
});