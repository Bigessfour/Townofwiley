#!/usr/bin/env node
/**
 * Advisory Ollama PR review — posts a comment (never auto-approves).
 * Requires: gh CLI, ollama serve + model pulled, GH_TOKEN with pull-requests: write.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ollamaGenerate } from './lib/ollama-api.mjs';
import { buildPrReviewPrompt } from './lib/ollama-pr-review-prompt.mjs';

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? 'outputs/pr-review';
const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';
const REPO = process.env.GITHUB_REPOSITORY ?? '';
const PR_NUMBER = process.env.PR_NUMBER ?? '';
const SKIP_DOCS_ONLY = process.env.SKIP_DOCS_ONLY !== '0';

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
}

async function runOllama(prompt) {
  return ollamaGenerate({
    model: MODEL,
    prompt,
    system: `You review Town of Wiley pull requests (Angular 21, PrimeNG, bilingual EN/ES, AWS CMS).
Use plain text only. Follow the output structure exactly. Reason step-by-step, then emit labeled sections.`,
    temperature: 0.2,
    numPredict: 2800,
  });
}

function isDocsOnlyDiff(diff) {
  const files = [...diff.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]);
  if (files.length === 0) {
    return false;
  }
  return files.every((f) => f.startsWith('docs/') || f === 'README.md' || f.endsWith('.md'));
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
  if (pr.isDraft) {
    console.log('Draft PR — skipping Ollama review.');
    return;
  }
  if (pr.author?.login === 'dependabot[bot]') {
    console.log('Dependabot PR — skipping Ollama review.');
    return;
  }

  const diff = gh(['pr', 'diff', PR_NUMBER]);
  if (!diff.trim()) {
    console.log('Empty diff — skipping.');
    return;
  }

  if (SKIP_DOCS_ONLY && isDocsOnlyDiff(diff)) {
    console.log('Docs-only diff — skipping Ollama review.');
    return;
  }

  const prompt = buildPrReviewPrompt({
    repository: REPO,
    prNumber: Number(PR_NUMBER),
    prTitle: pr.title,
    baseRef: pr.baseRefName,
    headSha: pr.headRefOid,
    diff,
  });

  writeFileSync(`${OUTPUT_DIR}/prompt.txt`, prompt, 'utf8');
  const review = await runOllama(prompt);
  writeFileSync(`${OUTPUT_DIR}/review.txt`, review, 'utf8');

  const body = [
    '## Ollama PR review (advisory)',
    '',
    '_Automated local-model review — not a substitute for human review or the required CI gate._',
    '',
    `**Model:** \`${MODEL}\``,
    '',
    '```',
    review.slice(0, 12_000),
    review.length > 12_000 ? '\n... [truncated for GitHub comment]' : '',
    '```',
  ].join('\n');

  writeFileSync(`${OUTPUT_DIR}/comment.md`, body, 'utf8');
  execFileSync('gh', ['pr', 'comment', PR_NUMBER, '--body-file', `${OUTPUT_DIR}/comment.md`], {
    stdio: 'inherit',
  });

  console.log('Posted Ollama PR review comment.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});