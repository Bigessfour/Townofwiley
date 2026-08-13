#!/usr/bin/env node
/**
 * Advisory Ollama PR review — sticky comment (never auto-approves).
 * Requires: gh CLI, ollama serve + model pulled, GH_TOKEN with pull-requests: write.
 *
 * `--gate-only` classifies the PR (Dependabot / docs-only) without calling Ollama
 * so GitHub Actions can skip model install.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { ollamaGenerate } from './lib/ollama-api.mjs';
import {
    buildPrReviewPrompt,
    classifyPrReviewGate,
    formatReviewMarkdown,
    isStructuredReview,
} from './lib/ollama-pr-review-prompt.mjs';

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? 'outputs/pr-review';
const MODEL = process.env.OLLAMA_MODEL ?? 'qwen2.5-coder:3b';
const REPO = process.env.GITHUB_REPOSITORY ?? '';
const PR_NUMBER = process.env.PR_NUMBER ?? '';
const SKIP_DOCS_ONLY = process.env.SKIP_DOCS_ONLY !== '0';
const GATE_ONLY = process.argv.includes('--gate-only');

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
}

function writeGithubOutput(key, value) {
  const path = process.env.GITHUB_OUTPUT;
  if (!path) {
    return;
  }
  appendFileSync(path, `${key}=${value}\n`);
}

async function runOllama(prompt) {
  return ollamaGenerate({
    model: MODEL,
    prompt,
    system: `You review Town of Wiley pull requests (Angular, PrimeNG, bilingual EN/ES, AWS CMS).
Plain text only. Follow the labeled output sections exactly. Never approve merge.
Flag CMS staff-only model exposure (e.g. EmailAlias) and a11y / i18n regressions.`,
    temperature: 0.1,
    numPredict: 1600,
    numCtx: Number(process.env.OLLAMA_NUM_CTX ?? 16384),
  });
}

function fallbackUnstructured(raw) {
  return [
    'SUMMARY: Model output did not follow the required review template.',
    'EVIDENCE: unparsed model text',
    'REASONING: Small models often ignore the template when the diff is large. Treat this as untrusted.',
    'RISK_LEVEL: medium',
    'MUST_FIX: none (unparsed — human review required)',
    'SHOULD_FIX: none',
    'SECURITY: unknown',
    'ACCESSIBILITY_I18N: unknown',
    'TEST_PLAN: rely on Site CI gate',
    'CONFIDENCE: low',
    '',
    'MODEL_OUTPUT:',
    raw.slice(0, 4_000),
  ].join('\n');
}

async function main() {
  if (!REPO || !PR_NUMBER) {
    console.error('GITHUB_REPOSITORY and PR_NUMBER are required');
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const prJson = gh([
    'pr',
    'view',
    PR_NUMBER,
    '--json',
    'title,baseRefName,headRefOid,isDraft,author',
  ]);
  const pr = JSON.parse(prJson);
  const changedPathsOrDiff = GATE_ONLY
    ? gh(['pr', 'diff', PR_NUMBER, '--name-only'])
    : gh(['pr', 'diff', PR_NUMBER]);
  const gate = classifyPrReviewGate(pr, changedPathsOrDiff, { skipDocsOnly: SKIP_DOCS_ONLY });

  if (GATE_ONLY) {
    writeGithubOutput('skip', gate.skip ? 'true' : 'false');
    writeGithubOutput('reason', gate.reason.replaceAll('\n', ' '));
    console.log(gate.skip ? gate.reason : 'Ollama PR review will run.');
    return;
  }

  if (gate.skip) {
    console.log(gate.reason);
    return;
  }

  const prompt = buildPrReviewPrompt({
    repository: REPO,
    prNumber: Number(PR_NUMBER),
    prTitle: pr.title,
    baseRef: pr.baseRefName,
    headSha: pr.headRefOid,
    diff: changedPathsOrDiff,
  });

  writeFileSync(`${OUTPUT_DIR}/prompt.txt`, prompt, 'utf8');

  let review;
  let unstructured = false;
  try {
    review = await runOllama(prompt);
    if (!isStructuredReview(review)) {
      unstructured = true;
      review = fallbackUnstructured(review);
    }
  } catch (error) {
    unstructured = true;
    review = fallbackUnstructured(`MODEL_OUTPUT: unavailable\nREASONING: ${error}`);
    console.error('Ollama generate failed:', error);
  }
  writeFileSync(`${OUTPUT_DIR}/review.txt`, review, 'utf8');

  const quality = unstructured ? 'low (unstructured)' : 'structured';
  const body = [
    '<!-- tow-sticky:ollama-pr-review -->',
    '## Ollama PR review (advisory)',
    '',
    '_Automated local-model review — not a substitute for human review or the required CI gate._',
    '',
    `**Model:** \`${MODEL}\``,
    `**Head:** \`${pr.headRefOid.slice(0, 7)}\``,
    `**Quality:** ${quality}`,
    '',
    formatReviewMarkdown(review, { unstructured }),
    '',
    'Artifacts: `ollama-pr-review-*` workflow upload (`outputs/pr-review/`).',
  ].join('\n');

  writeFileSync(`${OUTPUT_DIR}/comment.md`, body, 'utf8');
  execFileSync(
    'node',
    ['scripts/lib/ollama-sticky-comment.mjs', PR_NUMBER, 'ollama-pr-review', `${OUTPUT_DIR}/comment.md`],
    {
      stdio: 'inherit',
      env: process.env,
    },
  );

  console.log('Upserted sticky Ollama PR review comment.');
}

const isDirectRun = process.argv[1]?.endsWith('ollama-pr-review.mjs');
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
