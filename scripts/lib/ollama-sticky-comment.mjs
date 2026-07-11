/**
 * Upsert a sticky PR comment identified by an HTML marker comment.
 *
 * Requires: gh CLI, GH_TOKEN with pull-requests: write.
 *
 * Usage:
 *   node scripts/lib/ollama-sticky-comment.mjs <pr-number> <marker> <body-file>
 *
 * Marker example: ollama-ci-diagnosis
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const prNumber = process.argv[2];
const marker = process.argv[3];
const bodyFile = process.argv[4];

if (!prNumber || !marker || !bodyFile) {
  console.error('Usage: node scripts/lib/ollama-sticky-comment.mjs <pr-number> <marker> <body-file>');
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY;
if (!repo) {
  console.error('GITHUB_REPOSITORY is required');
  process.exit(1);
}

const markerToken = `<!-- tow-sticky:${marker} -->`;
let body = readFileSync(bodyFile, 'utf8').trim();
if (!body.includes(markerToken)) {
  body = `${markerToken}\n${body}`;
}

function ghJson(args) {
  return JSON.parse(execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
}

const comments = ghJson(['api', `repos/${repo}/issues/${prNumber}/comments`, '--paginate']);
const existing = comments.find((c) => typeof c.body === 'string' && c.body.includes(markerToken));

const dir = mkdtempSync(join(tmpdir(), 'tow-sticky-'));
const payloadPath = join(dir, 'payload.json');
writeFileSync(payloadPath, JSON.stringify({ body }), 'utf8');

if (existing?.id) {
  execFileSync(
    'gh',
    ['api', '-X', 'PATCH', `repos/${repo}/issues/comments/${existing.id}`, '--input', payloadPath],
    { stdio: 'inherit' },
  );
  console.log(`Updated sticky comment ${existing.id} on PR #${prNumber}`);
} else {
  execFileSync(
    'gh',
    ['api', '-X', 'POST', `repos/${repo}/issues/${prNumber}/comments`, '--input', payloadPath],
    { stdio: 'inherit' },
  );
  console.log(`Created sticky comment on PR #${prNumber}`);
}
