import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeModelOutput, stripAnsi } from './lib/ollama-text.mjs';

test('stripAnsi removes terminal control sequences', () => {
  const raw = 'hello\u001b[2Dworld\u001b[K!';
  assert.equal(stripAnsi(raw), 'helloworld!');
});

test('sanitizeModelOutput trims noisy blank lines', () => {
  assert.equal(sanitizeModelOutput('a\n\n\n\nb'), 'a\n\nb');
});