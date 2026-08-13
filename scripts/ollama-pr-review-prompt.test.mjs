import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildPrReviewPrompt,
    classifyPrReviewGate,
    formatReviewMarkdown,
    isStructuredReview,
    parseReviewSections,
    prioritizeReviewDiff,
    truncateDiff,
} from './lib/ollama-pr-review-prompt.mjs';

test('truncateDiff splits large patches', () => {
  const huge = 'a'.repeat(100_000);
  const { diff, truncated, omittedChars } = truncateDiff(huge, 10_000);
  assert.equal(truncated, true);
  assert.ok(omittedChars > 0);
  assert.ok(diff.length < huge.length);
  assert.match(diff, /omitted for model context/);
});

test('buildPrReviewPrompt includes structured sections after the diff', () => {
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
  assert.ok(prompt.lastIndexOf('MUST_FIX:') > prompt.lastIndexOf('Diff:'));
});

test('prioritizeReviewDiff drops generated inventory and keeps source first', () => {
  const diff = [
    'diff --git a/docs/function-inventory.generated.md b/docs/function-inventory.generated.md\n+noise',
    'diff --git a/src/app/cms-notice-media.ts b/src/app/cms-notice-media.ts\n+real',
  ].join('\n');
  const { diff: focused, droppedFiles } = prioritizeReviewDiff(diff, 16_000);
  assert.ok(droppedFiles.includes('docs/function-inventory.generated.md'));
  assert.match(focused, /cms-notice-media/);
  assert.doesNotMatch(focused, /function-inventory\.generated/);
});

test('isStructuredReview requires SUMMARY, MUST_FIX, and a valid RISK_LEVEL', () => {
  const good = 'SUMMARY: ok\nEVIDENCE: src/a.ts\nRISK_LEVEL: low\nMUST_FIX: none\nCONFIDENCE: high\n';
  assert.equal(isStructuredReview(good), true);
  assert.equal(isStructuredReview('This PR looks fine overall.'), false);
  assert.equal(
    isStructuredReview('SUMMARY: ramble\nMUST_FIX: none\nRISK_LEVEL: I guess it is fine\n'),
    false,
  );
  assert.equal(parseReviewSections(good).MUST_FIX, 'none');
});

test('formatReviewMarkdown renders labeled sections', () => {
  const md = formatReviewMarkdown('SUMMARY: ship it\nRISK_LEVEL: low\nMUST_FIX: none\n');
  assert.match(md, /### SUMMARY/);
  assert.match(md, /ship it/);
});

test('classifyPrReviewGate skips Dependabot and docs-only', () => {
  const srcDiff = 'diff --git a/src/app/app.ts b/src/app/app.ts\n+x';
  assert.equal(
    classifyPrReviewGate({ author: { login: 'dependabot[bot]' } }, srcDiff).skip,
    true,
  );
  assert.equal(
    classifyPrReviewGate({ author: { login: 'human' } }, 'diff --git a/docs/a.md b/docs/a.md\n+x')
      .skip,
    true,
  );
  assert.equal(
    classifyPrReviewGate({ author: { login: 'human' } }, 'docs/ci-ollama-review.md\nREADME.md').skip,
    true,
  );
  assert.equal(classifyPrReviewGate({ author: { login: 'human' } }, srcDiff).skip, false);
  assert.equal(
    classifyPrReviewGate({ author: { login: 'human' } }, 'src/app/app.ts\ne2e/README.md').skip,
    false,
  );
});
