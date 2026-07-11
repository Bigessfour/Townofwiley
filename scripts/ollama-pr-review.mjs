#!/usr/bin/env node
/**
 * Advisory Ollama PR review — posts a comment (never auto-approves).
 * Requires: gh CLI, ollama serve + model pulled, GH_TOKEN with pull-requests: write.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildPrReviewPrompt } from './lib/ollama-pr-review-prompt.mjs';

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? 'outputs/pr-review';
const MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';
const REPO = process.env.GITHUB_REPOSITORY ?? '';
const PR_NUMBER = process.env.PR_NUMBER ?? '';
const SKIP_DOCS_ONLY = process.env.SKIP_DOCS_ONLY !== '0';

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
}

function runOllama(prompt) {
  const result = spawnSync('ollama', ['run', MODEL, prompt], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `ollama run failed with status ${result.status}`);
  }
  return result.stdout.trim();
}

function isDocsOnlyDiff(diff) {
  const files = [...diff.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]);
  if (files.length === 0) {
    return false;
  }
  return files.every((f) => f.startsWith('docs/') || f === 'README.md' || f.endsWith('.md'));
}

function main() {
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
  const review = runOllama(prompt);
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

main();