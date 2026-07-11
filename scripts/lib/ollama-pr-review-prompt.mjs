/**
 * Build prompts and truncate PR diffs for Ollama advisory review.
 */

const DEFAULT_MAX_DIFF_CHARS = 48_000;

/**
 * @param {string} diff
 * @param {number} [maxChars]
 * @returns {{ diff: string; truncated: boolean; omittedChars: number }}
 */
export function truncateDiff(diff, maxChars = DEFAULT_MAX_DIFF_CHARS) {
  if (diff.length <= maxChars) {
    return { diff, truncated: false, omittedChars: 0 };
  }
  const head = Math.floor(maxChars * 0.55);
  const tail = maxChars - head;
  const omitted = diff.length - head - tail;
  const body = [
    diff.slice(0, head),
    `\n\n... [${omitted} diff characters omitted for model context] ...\n\n`,
    diff.slice(-tail),
  ].join('');
  return { diff: body, truncated: true, omittedChars: omitted };
}

/**
 * @param {{
 *   repository: string;
 *   prNumber: number;
 *   prTitle: string;
 *   baseRef: string;
 *   headSha: string;
 *   diff: string;
 * }} input
 * @returns {string}
 */
export function buildPrReviewPrompt(input) {
  const { diff, truncated, omittedChars } = truncateDiff(input.diff);
  const truncationNote = truncated
    ? `Note: diff truncated (${omittedChars} chars omitted). Focus on highest-risk hunks.\n\n`
    : '';

  return `You are a senior reviewer for the Town of Wiley official website (townofwiley.gov).

Stack: Angular 21 standalone components, signals, PrimeNG, SCSS, bilingual EN/ES user copy, AWS static hosting + AppSync CMS.
Rules: WCAG AA, no ngClass/ngStyle, minimal diffs, public CMS must not expose staff-only models (e.g. EmailAlias).

Review pull request #${input.prNumber} "${input.prTitle}" (${input.repository}, base ${input.baseRef}, head ${input.headSha}).

${truncationNote}Respond in this exact structure:

SUMMARY: (2-3 sentences)
RISK_LEVEL: low|medium|high
MUST_FIX: (numbered list — blocking issues for merge; use "none" if empty)
SHOULD_FIX: (numbered list — non-blocking improvements)
SECURITY: (secrets, auth, CMS exposure, runtime-config — one short paragraph)
ACCESSIBILITY_I18N: (a11y + EN/ES copy gaps)
TEST_PLAN: (concrete commands: npm run lint, test:vitest, test:unit:browser, test:e2e:smoke)
CONFIDENCE: low|medium|high

Diff:
${diff}`;
}