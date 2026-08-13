/**
 * Build prompts and truncate PR diffs for Ollama advisory review.
 *
 * Small coder models (3B) lose the output template when the diff fills the
 * context window. Keep the review payload focused and put the required
 * sections *after* the diff.
 */

const DEFAULT_MAX_DIFF_CHARS = 16_000;

export const REVIEW_SECTION_KEYS = [
  'SUMMARY',
  'EVIDENCE',
  'REASONING',
  'RISK_LEVEL',
  'MUST_FIX',
  'SHOULD_FIX',
  'SECURITY',
  'ACCESSIBILITY_I18N',
  'TEST_PLAN',
  'CONFIDENCE',
];

const NOISE_PATH_RE = [
  /^docs\/function-inventory\.generated\.md$/,
  /^docs\/function-tree\.md$/,
  /^docs\/function-inventory/,
  /package-lock\.json$/,
  /\.generated\./,
];

const PRIORITY_PREFIXES = [
  'src/',
  'e2e/',
  'scripts/',
  '.github/',
  'infrastructure/',
  'public/',
  'playwright.config.ts',
  'angular.json',
];

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
 * @param {string} path
 */
function isNoisePath(path) {
  return NOISE_PATH_RE.some((re) => re.test(path));
}

/**
 * @param {string} path
 */
function isPriorityPath(path) {
  return PRIORITY_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

/**
 * Split a unified diff into per-file hunks.
 * @param {string} diff
 * @returns {{ path: string; hunk: string }[]}
 */
export function splitDiffByFile(diff) {
  const parts = diff.split(/^diff --git /m);
  /** @type {{ path: string; hunk: string }[]} */
  const files = [];
  for (const part of parts) {
    if (!part.trim()) {
      continue;
    }
    const hunk = `diff --git ${part}`;
    const match = hunk.match(/^diff --git a\/(\S+)/);
    files.push({ path: match?.[1] ?? '', hunk });
  }
  return files;
}

/**
 * Drop generated/lockfile noise and keep source, tests, CI, and infra first.
 * @param {string} diff
 * @param {number} [maxChars]
 * @returns {{ diff: string; truncated: boolean; omittedChars: number; droppedFiles: string[] }}
 */
export function prioritizeReviewDiff(diff, maxChars = DEFAULT_MAX_DIFF_CHARS) {
  const files = splitDiffByFile(diff);
  const droppedFiles = files.filter((f) => isNoisePath(f.path)).map((f) => f.path);
  const kept = files.filter((f) => !isNoisePath(f.path));
  const priority = kept.filter((f) => isPriorityPath(f.path));
  const rest = kept.filter((f) => !isPriorityPath(f.path));
  const ordered = [...priority, ...rest];
  const combined = ordered.map((f) => f.hunk).join('');
  const truncated = truncateDiff(combined, maxChars);
  return { ...truncated, droppedFiles };
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseReviewSections(text) {
  /** @type {Record<string, string>} */
  const sections = {};
  const lines = String(text).split('\n');
  let current = '';
  /** @type {string[]} */
  let buf = [];

  const flush = () => {
    if (current) {
      sections[current] = buf.join('\n').trim();
    }
  };

  for (const line of lines) {
    const match = line.match(/^([A-Z][A-Z0-9_]+):\s*(.*)$/);
    if (match && REVIEW_SECTION_KEYS.includes(match[1])) {
      flush();
      current = match[1];
      buf = match[2] ? [match[2]] : [];
      continue;
    }
    if (current) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

/**
 * @param {string} text
 */
export function isStructuredReview(text) {
  const sections = parseReviewSections(text);
  if (!sections.SUMMARY || !sections.MUST_FIX || !sections.RISK_LEVEL) {
    return false;
  }
  const risk = sections.RISK_LEVEL.trim().split(/\s+/)[0]?.toLowerCase();
  return risk === 'low' || risk === 'medium' || risk === 'high';
}

/**
 * @param {string} text
 * @param {{ unstructured?: boolean }} [options]
 */
export function formatReviewMarkdown(text, options = {}) {
  if (options.unstructured) {
    return [
      '**Quality:** low — the model did not follow the required template. Do not treat this as a real review.',
      '',
      '```',
      text.slice(0, 8_000),
      text.length > 8_000 ? '\n... [truncated]' : '',
      '```',
    ].join('\n');
  }

  const sections = parseReviewSections(text);
  const blocks = REVIEW_SECTION_KEYS.filter((key) => sections[key]).map(
    (key) => `### ${key}\n\n${sections[key]}`,
  );
  return blocks.join('\n\n');
}

/**
 * @param {string} diffOrNameList unified diff or `gh pr diff --name-only` output
 * @returns {string[]}
 */
export function listChangedPaths(diffOrNameList) {
  const fromGit = [...diffOrNameList.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]);
  if (fromGit.length > 0) {
    return fromGit;
  }
  return diffOrNameList
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('diff '));
}

/**
 * @param {string} diffOrNameList
 */
export function isDocsOnlyDiff(diffOrNameList) {
  const files = listChangedPaths(diffOrNameList);
  if (files.length === 0) {
    return false;
  }
  return files.every((f) => f.startsWith('docs/') || f === 'README.md' || f.endsWith('.md'));
}

/**
 * @param {{ author?: { login?: string }; isDraft?: boolean }} pr
 * @param {string} diff
 * @param {{ skipDocsOnly?: boolean }} [options]
 * @returns {{ skip: boolean; reason: string }}
 */
export function classifyPrReviewGate(pr, diff, options = {}) {
  const skipDocsOnly = options.skipDocsOnly !== false;
  if (pr.isDraft) {
    return { skip: true, reason: 'Draft PR — skipping Ollama review.' };
  }
  if (pr.author?.login === 'dependabot[bot]') {
    return { skip: true, reason: 'Dependabot PR — skipping Ollama review.' };
  }
  if (!diff.trim()) {
    return { skip: true, reason: 'Empty diff — skipping.' };
  }
  if (skipDocsOnly && isDocsOnlyDiff(diff)) {
    return { skip: true, reason: 'Docs-only diff — skipping Ollama review.' };
  }
  return { skip: false, reason: '' };
}

function outputContract() {
  return `Respond in this exact structure (plain text labels, no markdown headings, no extra preamble):

SUMMARY:
EVIDENCE: (file paths / patterns you relied on from the diff)
REASONING: (short step-by-step, then conclusion)
RISK_LEVEL: low|medium|high
MUST_FIX:
SHOULD_FIX:
SECURITY:
ACCESSIBILITY_I18N:
TEST_PLAN:
CONFIDENCE: low|medium|high

Rules for MUST_FIX: only concrete defects in the diff (broken imports, missing bilingual copy, staff CMS leaked to public, a11y regressions). If none, write "none".
Never approve merge. Never invent files that are not in the diff.`;
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
  const { diff, truncated, omittedChars, droppedFiles } = prioritizeReviewDiff(input.diff);
  const notes = [];
  if (droppedFiles.length > 0) {
    notes.push(`Omitted generated/lockfile paths: ${droppedFiles.slice(0, 8).join(', ')}.`);
  }
  if (truncated) {
    notes.push(`Diff truncated (${omittedChars} chars omitted). Focus on highest-risk hunks.`);
  }
  const truncationNote = notes.length > 0 ? `${notes.join(' ')}\n\n` : '';

  return `You are a senior reviewer for the Town of Wiley official website (townofwiley.gov).

Stack: Angular standalone components, signals, PrimeNG, SCSS, bilingual EN/ES user copy, AWS static hosting + AppSync CMS.
Rules: WCAG AA, no ngClass/ngStyle, minimal diffs, public CMS must not expose staff-only models (e.g. EmailAlias).

Review pull request #${input.prNumber} "${input.prTitle}" (${input.repository}, base ${input.baseRef}, head ${input.headSha}).

${truncationNote}Diff:
${diff}

---
${outputContract()}`;
}
