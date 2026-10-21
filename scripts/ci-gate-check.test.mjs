import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCiGate } from './ci-gate-check.mjs';

describe('evaluateCiGate', () => {
  it('passes when build-and-test succeeds', () => {
    const { ok, failures } = evaluateCiGate({
      'build-and-test': { result: 'success' },
    });

    assert.equal(ok, true);
    assert.deepEqual(failures, []);
  });

  it('fails when build-and-test failed', () => {
    const { ok, failures } = evaluateCiGate({
      'build-and-test': { result: 'failure' },
    });

    assert.equal(ok, false);
    assert.ok(failures.some((f) => f.includes('build-and-test')));
  });

  it('fails when build-and-test is missing', () => {
    const { ok, failures } = evaluateCiGate({});

    assert.equal(ok, false);
    assert.ok(failures.some((f) => f.includes('missing')));
  });
});
