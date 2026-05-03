#!/usr/bin/env node
/**
 * Fail if Content-Security-Policy in amplify.yml (customHeaders for all paths)
 * and repo-root customHttp.yml differ. Prevents Amplify header drift between
 * buildspec headers and app-level customHeaders (see AWS migrate-custom-headers guidance).
 *
 * Usage: node scripts/verify-custom-http-csp-parity.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

function extractCspValue(text, label) {
  const re = /['"]Content-Security-Policy['"]\s*\n\s*value:\s*"([^"]*)"/;
  const m = text.match(re);
  if (!m) {
    throw new Error(`${label}: could not find Content-Security-Policy value: "..." line`);
  }
  return m[1];
}

function assertBaseline(csp, label) {
  const checks = [
    [/connect-src[^;]*googletagmanager/i, 'connect-src must allow googletagmanager (gtag)'],
    [/font-src[^;]*data:/, 'font-src must include data: (PrimeIcons / icomoon)'],
    [/frame-src\s+'none'/, "frame-src must be 'none'"],
    [/object-src\s+'none'/, "object-src must be 'none'"],
  ];
  for (const [pattern, msg] of checks) {
    if (!pattern.test(csp)) {
      throw new Error(`${label}: ${msg}`);
    }
  }
}

const amp = readFileSync(join(root, 'amplify.yml'), 'utf8');
const custom = readFileSync(join(root, 'customHttp.yml'), 'utf8');

const cspAmp = extractCspValue(amp, 'amplify.yml');
const cspCustom = extractCspValue(custom, 'customHttp.yml');

assertBaseline(cspAmp, 'amplify.yml');
assertBaseline(cspCustom, 'customHttp.yml');

if (cspAmp !== cspCustom) {
  console.error(
    'error: Content-Security-Policy values differ between amplify.yml and customHttp.yml.\n' +
      'Edit both files to use the same CSP string, then run `npm run amplify:sync-headers` after merge.\n' +
      'AWS recommends managing hosting headers via customHttp.yml (see docs/amplify-deployment-runbook.md).',
  );
  process.exit(1);
}

console.log('OK: amplify.yml and customHttp.yml Content-Security-Policy values match.');
