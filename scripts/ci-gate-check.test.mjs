import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateCiGate } from './ci-gate-check.mjs';

describe('evaluateCiGate', () => {
  it('passes when always-on jobs succeed and conditional jobs are skipped', () => {
    const { ok, failures } = evaluateCiGate({
      'detect-changes': { result: 'success' },
      'custom-headers-parity': { result: 'success' },
      'verify-playwright-mcp-package': { result: 'success' },
      'csp-angular-sync-check': { result: 'skipped' },
      'verify-aws-infra-manifest': { result: 'skipped' },
      'frontend-lint-build': { result: 'skipped' },
      'frontend-smoke': { result: 'skipped' },
      'site-monitor-tests': { result: 'skipped' },
      'site-runtime-proxy-tests': { result: 'skipped' },
      'backend-python-tests': { result: 'skipped' },
      'security-audit': { result: 'skipped' },
      'maintainer-only-summary': { result: 'success' },
    });

    assert.equal(ok, true);
    assert.deepEqual(failures, []);
  });

  it('fails when any gated job failed', () => {
    const { ok, failures } = evaluateCiGate({
      'detect-changes': { result: 'success' },
      'custom-headers-parity': { result: 'success' },
      'verify-playwright-mcp-package': { result: 'success' },
      'csp-angular-sync-check': { result: 'skipped' },
      'verify-aws-infra-manifest': { result: 'skipped' },
      'frontend-lint-build': { result: 'failure' },
      'frontend-smoke': { result: 'skipped' },
      'site-monitor-tests': { result: 'skipped' },
      'site-runtime-proxy-tests': { result: 'skipped' },
      'backend-python-tests': { result: 'skipped' },
      'security-audit': { result: 'skipped' },
      'maintainer-only-summary': { result: 'skipped' },
    });

    assert.equal(ok, false);
    assert.ok(failures.some((f) => f.includes('frontend-lint-build')));
  });

  it('fails when always-required jobs do not succeed', () => {
    const { ok, failures } = evaluateCiGate({
      'detect-changes': { result: 'success' },
      'custom-headers-parity': { result: 'failure' },
      'verify-playwright-mcp-package': { result: 'success' },
      'csp-angular-sync-check': { result: 'skipped' },
      'verify-aws-infra-manifest': { result: 'skipped' },
      'frontend-lint-build': { result: 'skipped' },
      'frontend-smoke': { result: 'skipped' },
      'site-monitor-tests': { result: 'skipped' },
      'site-runtime-proxy-tests': { result: 'skipped' },
      'backend-python-tests': { result: 'skipped' },
      'security-audit': { result: 'skipped' },
      'maintainer-only-summary': { result: 'success' },
    });

    assert.equal(ok, false);
    assert.ok(failures.some((f) => f.includes('custom-headers-parity')));
  });
});
