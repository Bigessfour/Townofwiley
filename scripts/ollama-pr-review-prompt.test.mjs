import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPrReviewPrompt, truncateDiff } from './lib/ollama-pr-review-prompt.mjs';

test('truncateDiff splits large patches', () => {
  const huge = 'a'.repeat(100_000);
  const { diff, truncated, omittedChars } = truncateDiff(huge, 10_000);
  assert.equal(truncated, true);
  assert.ok(omittedChars > 0);
  assert.ok(diff.length < huge.length);
  assert.match(diff, /omitted for model context/);
});

test('buildPrReviewPrompt includes structured sections', () => {
  const prompt = buildPrReviewPrompt({
    repository: 'org/repo',
    prNumber: 108,
    prTitle: 'Theme',
    baseRef: 'main',
    headSha: 'abc123',
    diff: 'diff --git a/src/app/app.ts b/src/app/app.ts\n+change',
  });
  assert.match(prompt, /MUST_FIX:/);
  assert.match(prompt, /Town of Wiley/);
  assert.match(prompt, /#108/);
});