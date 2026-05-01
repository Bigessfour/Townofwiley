#!/usr/bin/env node
/**
 * Enforces package.json engines.node majors so local dev matches CI (.nvmrc / GitHub Actions Node 24).
 * Set SKIP_NODE_VERSION_CHECK=1 to bypass temporarily.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.SKIP_NODE_VERSION_CHECK === '1') {
  process.exit(0);
}

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const range = typeof pkg.engines?.node === 'string' ? pkg.engines.node : '';
const allowed = new Set([...range.matchAll(/\^(\d+)/g)].map((m) => Number(m[1])));

if (allowed.size === 0) {
  console.warn('[ensure-node-version] No engines.node majors parsed; skipping check.');
  process.exit(0);
}

const major = Number(process.version.slice(1).split('.')[0]);
if (!allowed.has(major)) {
  const sorted = [...allowed].sort((a, b) => b - a);
  console.error(
    [
      `[ensure-node-version] Node ${process.version} is not supported.`,
      `Use Node ${sorted.join(' or ')}.x (see package.json "engines" and .nvmrc).`,
      'Examples: nvm use   ·   fnm use   ·   brew link node@24 (PATH should include node@24 before other Node installs).',
      'Or once: SKIP_NODE_VERSION_CHECK=1 npm start',
    ].join('\n'),
  );
  process.exit(1);
}
