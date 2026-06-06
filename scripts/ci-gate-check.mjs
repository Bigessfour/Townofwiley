#!/usr/bin/env node
/**
 * Validates GitHub Actions `needs` context for the ci-gate merge job.
 * Fails on failure/cancelled; skipped and success are OK for conditional jobs.
 * Always requires detect-changes and custom-headers-parity to succeed.
 */

import { fileURLToPath } from 'node:url';

/** @typedef {{ result: string }} NeedsJob */

export const ALWAYS_REQUIRED = ['detect-changes', 'custom-headers-parity'];

export const GATED_JOBS = [
  'detect-changes',
  'custom-headers-parity',
  'verify-playwright-mcp-package',
  'csp-angular-sync-check',
  'verify-aws-infra-manifest',
  'frontend-lint-build',
  'frontend-smoke',
  'site-monitor-tests',
  'site-runtime-proxy-tests',
  'contact-infra-tests',
  'backend-python-tests',
  'security-audit',
  'maintainer-only-summary',
];

/**
 * @param {Record<string, NeedsJob>} needs
 * @returns {{ ok: boolean; failures: string[] }}
 */
export function evaluateCiGate(needs) {
  const failures = [];

  for (const name of GATED_JOBS) {
    const job = needs[name];
    if (!job) {
      failures.push(`${name}: missing from needs context`);
      continue;
    }

    const { result } = job;
    if (result === 'failure' || result === 'cancelled') {
      failures.push(`${name}: ${result}`);
    }

    if (ALWAYS_REQUIRED.includes(name) && result !== 'success') {
      failures.push(`${name}: must succeed (got ${result})`);
    }
  }

  return { ok: failures.length === 0, failures };
}

function main() {
  const raw = process.env.NEEDS_JSON;
  if (!raw) {
    console.error('::error::NEEDS_JSON environment variable is required');
    process.exit(1);
  }

  /** @type {Record<string, NeedsJob>} */
  let needs;
  try {
    needs = JSON.parse(raw);
  } catch (error) {
    console.error('::error::Invalid NEEDS_JSON:', error);
    process.exit(1);
  }

  const { ok, failures } = evaluateCiGate(needs);
  if (ok) {
    console.log('CI gate: all required jobs passed or were appropriately skipped');
    return;
  }

  for (const message of failures) {
    console.error(`::error::${message}`);
  }
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
