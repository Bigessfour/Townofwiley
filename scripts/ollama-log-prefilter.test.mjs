import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPrefilteredLogs, prefilterCiLogLines } from './lib/ollama-log-prefilter.mjs';

test('prefilterCiLogLines keeps error context', () => {
  const raw = ['ok line', 'vitest failed: AssertionError', 'expected true', 'another ok'].join('\n');
  const lines = prefilterCiLogLines(raw);
  assert.ok(lines.some((l) => l.includes('AssertionError')));
  assert.ok(lines.includes('---'));
});

test('formatPrefilteredLogs handles empty signals', () => {
  const out = formatPrefilteredLogs('only neutral lines\nstill fine\n');
  assert.match(out, /no high-signal lines matched/);
});