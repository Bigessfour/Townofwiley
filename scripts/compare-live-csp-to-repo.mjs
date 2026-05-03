#!/usr/bin/env node
/**
 * Compare Content-Security-Policy returned by live hosting to the repo CSP in customHttp.yml.
 * Use after deploy to confirm Amplify picked up customHttp.yml (or npm run amplify:sync-headers).
 *
 * Usage:
 *   node scripts/compare-live-csp-to-repo.mjs
 *   E2E_BASE_URL=https://preview.example.amplifyapp.com node scripts/compare-live-csp-to-repo.mjs
 *
 * Exit 0 only when headers match exactly (normalized whitespace). Intermittent 504s on HTML
 * requests are a separate gateway/origin issue — retry or check Amplify/CloudFront health.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

function extractCspFromCustomHttp(text) {
  const re = /['"]Content-Security-Policy['"]\s*\n\s*value:\s*"([^"]*)"/;
  const m = text.match(re);
  if (!m) {
    throw new Error('customHttp.yml: could not find Content-Security-Policy value line');
  }
  return m[1];
}

function normalizeCsp(csp) {
  return csp.replace(/\s+/g, ' ').trim();
}

function extractConnectSrc(csp) {
  const m = csp.match(/connect-src\s+([^;]+)/i);
  return m ? m[1].trim() : '';
}

const base =
  process.env.E2E_BASE_URL?.trim() ||
  process.env.PRIMARY_URL?.trim() ||
  'https://www.townofwiley.gov/';

const custom = readFileSync(join(root, 'customHttp.yml'), 'utf8');
const repoCsp = extractCspFromCustomHttp(custom);

const res = await fetch(base, {
  method: 'HEAD',
  redirect: 'follow',
  headers: { 'User-Agent': 'TownOfWiley-CSP-Compare/1.0' },
});

const liveCsp = res.headers.get('content-security-policy');
if (!liveCsp) {
  console.error(`error: no Content-Security-Policy header on ${base} (HTTP ${res.status})`);
  process.exit(1);
}

const repoNorm = normalizeCsp(repoCsp);
const liveNorm = normalizeCsp(liveCsp);

if (repoNorm === liveNorm) {
  console.log(`OK: live CSP matches customHttp.yml (${base})`);
  process.exit(0);
}

console.error(`error: Content-Security-Policy on ${base} does not match repo customHttp.yml`);
console.error('');
console.error(
  'Remediation (Wiley AWS account): npm run amplify:sync-headers, then redeploy Amplify so CloudFront serves updated headers.',
);
console.error('');
const liveConnect = extractConnectSrc(liveNorm);
const repoConnect = extractConnectSrc(repoNorm);
if (liveConnect && repoConnect && liveConnect !== repoConnect) {
  console.error(
    'connect-src differs: live is missing hosts present in repo (e.g. worker-src / doubleclick / frame-src changes often accompany this).',
  );
}
console.error(`Repo (prefix): ${repoNorm.slice(0, 220)}…`);
console.error(`Live (prefix): ${liveNorm.slice(0, 220)}…`);
process.exit(1);
