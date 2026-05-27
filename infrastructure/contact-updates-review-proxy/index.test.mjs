import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedOrigin } from './origin-check.mjs';

test('isAllowedOrigin allows production hostnames', () => {
  assert.equal(isAllowedOrigin('https://www.townofwiley.gov'), true);
  assert.equal(isAllowedOrigin('https://townofwiley.gov'), true);
  assert.equal(isAllowedOrigin(''), false);
  assert.equal(isAllowedOrigin('https://evil.example'), false);
});
