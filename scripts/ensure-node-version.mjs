#!/usr/bin/env node
/**
 * Enforces package.json engines.node so local dev matches CI (.nvmrc / GitHub Actions Node 24).
 * Supports caret majors (^24.0.0) and bounded ranges (>=24.0.0 <25.0.0). Node 25+ is rejected.
 * Set SKIP_NODE_VERSION_CHECK=1 to bypass temporarily.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.SKIP_NODE_VERSION_CHECK === '1') {
  process.exit(0);
}

/** @param {string} range */
function allowedNodeMajors(range) {
  const trimmed = range.trim();
  const majors = new Set();

  const bounded = trimmed.match(/^>=\s*(\d+)\.[\d.]*\s+<\s*(\d+)\./);
  if (bounded) {
    const minMajor = Number(bounded[1]);
    const maxExclusive = Number(bounded[2]);
    for (let m = minMajor; m < maxExclusive; m++) {
      majors.add(m);
    }
    return majors;
  }

  for (const m of trimmed.matchAll(/\^(\d+)/g)) {
    majors.add(Number(m[1]));
  }

  return majors;
}

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const range = typeof pkg.engines?.node === 'string' ? pkg.engines.node : '';
const allowed = allowedNodeMajors(range);

if (allowed.size === 0) {
  console.warn('[ensure-node-version] No engines.node majors parsed; skipping check.');
  process.exit(0);
}

const major = Number(process.version.slice(1).split('.')[0]);
if (!allowed.has(major)) {
  const sorted = [...allowed].sort((a, b) => a - b);
  const span =
    sorted.length === 1
      ? `${sorted[0]}.x only`
      : `${sorted[0]}.x through ${sorted[sorted.length - 1]}.x`;
  console.error(
    [
      `[ensure-node-version] Node ${process.version} is not supported.`,
      `This repo targets Node ${span} (see package.json "engines", .nvmrc, and README).`,
      'Node 25+ is excluded due to toolchain and native dependency issues.',
      'Examples: nvm install 24 && nvm use   ·   fnm use 24   ·   PATH with node@24 before other installs.',
      'Or once: SKIP_NODE_VERSION_CHECK=1 npm start',
    ].join('\n'),
  );
  process.exit(1);
}
