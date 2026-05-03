#!/usr/bin/env node
/**
 * Enforce AWS-recommended single source for Amplify Hosting headers: repo-root
 * customHttp.yml only (no customHeaders in amplify.yml).
 *
 * https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html
 *
 * Usage: node scripts/verify-custom-http-yaml.mjs
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

if (/^\s*customHeaders:/m.test(amp)) {
  console.error(
    'error: amplify.yml must not define customHeaders.\n' +
      'Per AWS, use repo-root customHttp.yml only, then deploy and run npm run amplify:sync-headers as needed.\n' +
      'https://docs.aws.amazon.com/amplify/latest/userguide/migrate-custom-headers.html',
  );
  process.exit(1);
}

const cspCustom = extractCspValue(custom, 'customHttp.yml');
assertBaseline(cspCustom, 'customHttp.yml');

console.log('OK: customHttp.yml CSP baseline satisfied; amplify.yml has no customHeaders block.');
