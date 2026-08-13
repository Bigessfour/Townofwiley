#!/usr/bin/env node
/**
 * Lightweight unit tests for JS RAG (no full index required).
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chunkFile } from '../rag/js/chunking.mjs';
import { findRepoRoot, globToRegExp, pathMatchesGlob, shouldIndexFile } from '../rag/js/config.mjs';
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

test('MCP handshake replies with NDJSON and lists tools', async () => {
  const child = spawn(process.execPath, [path.join(repoRoot, 'scripts/rag-mcp.mjs')], {
    cwd: repoRoot,
    env: { ...process.env, TOW_RAG_ROOT: repoRoot },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const chunks = [];
  child.stdout.on('data', (chunk) => {
    chunks.push(chunk);
  });

  const write = (message) => {
    child.stdin.write(`${JSON.stringify(message)}\n`);
  };
  write({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'rag-test', version: '0' },
    },
  });
  write({ jsonrpc: '2.0', method: 'notifications/initialized' });
  write({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });

  const text = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`MCP handshake timed out: ${Buffer.concat(chunks).toString('utf8')}`));
    }, 8_000);
    const check = () => {
      const out = Buffer.concat(chunks).toString('utf8');
      if (out.includes('search_codebase') && out.includes('rag_status')) {
        clearTimeout(timer);
        resolve(out);
      }
    };
    child.stdout.on('data', check);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      if (code && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`MCP server exited ${code}`));
      }
    });
  });

  child.kill();
  assert.ok(!text.includes('Content-Length:'), 'Cursor requires NDJSON, not LSP Content-Length');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const init = JSON.parse(lines[0]);
  assert.equal(init.result.serverInfo.name, 'townofwiley-rag');
  const listed = JSON.parse(lines[1]);
  const names = listed.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, ['search_codebase', 'rag_status']);
});
