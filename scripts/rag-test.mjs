#!/usr/bin/env node
/**
 * Lightweight unit tests for JS RAG (no full index required).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globToRegExp, pathMatchesGlob, shouldIndexFile, findRepoRoot } from '../rag/js/config.mjs';
import { chunkFile } from '../rag/js/chunking.mjs';
import { discoverIndexFiles } from '../rag/js/discover.mjs';
import { formatHitsMarkdown, searchCodebase } from '../rag/js/search.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('globToRegExp matches top-level docs/*.md via docs/**/*.md', () => {
  assert.equal(pathMatchesGlob('docs/codebase-rag.md', 'docs/**/*.md'), true);
  assert.equal(pathMatchesGlob('docs/design/foo.md', 'docs/**/*.md'), true);
  assert.equal(pathMatchesGlob('src/app/x.ts', 'docs/**/*.md'), false);
  assert.equal(pathMatchesGlob('customHttp.yml', 'customHttp.yml'), true);
});

test('shouldIndexFile accepts docs and workflows', () => {
  const root = findRepoRoot(repoRoot);
  assert.equal(shouldIndexFile(root, path.join(root, 'docs/codebase-rag.md')), true);
  assert.equal(
    shouldIndexFile(root, path.join(root, '.github/workflows/ci.yml')),
    true,
  );
  assert.equal(
    shouldIndexFile(root, path.join(root, 'node_modules/foo/index.js')),
    false,
  );
});

test('discoverIndexFiles finds docs', () => {
  const files = discoverIndexFiles(repoRoot);
  const rels = files.map((f) => path.relative(repoRoot, f).split(path.sep).join('/'));
  assert.ok(rels.some((r) => r.startsWith('docs/')), 'expected docs/ in discover');
  assert.ok(rels.some((r) => r.includes('.github/workflows/')), 'expected workflows');
  assert.ok(files.length > 100, `expected substantial corpus, got ${files.length}`);
});

test('chunkFile produces path and lines', () => {
  const abs = path.join(repoRoot, 'docs/codebase-rag.md');
  const chunks = chunkFile(repoRoot, abs);
  assert.ok(chunks.length > 0);
  assert.equal(chunks[0].path, 'docs/codebase-rag.md');
  assert.ok(chunks[0].startLine >= 1);
});

test('searchCodebase returns hits for staff auth', () => {
  const hits = searchCodebase('staff auth guard Cognito admin login', {
    limit: 5,
    repoRoot,
  });
  assert.ok(hits.length > 0, 'expected search hits');
  const md = formatHitsMarkdown(hits, 'staff auth');
  assert.match(md, /RAG results/);
  assert.ok(
    hits.some((h) => /auth|admin|staff/i.test(h.path) || /auth|staff|cognito/i.test(h.snippet)),
    'expected auth-related hit',
  );
});

test('globToRegExp anchors correctly', () => {
  const re = globToRegExp('src/**/*.ts');
  assert.ok(re.test('src/app/auth/staff-auth.guard.ts'));
  assert.ok(!re.test('e2e/src/app/foo.ts'));
});
