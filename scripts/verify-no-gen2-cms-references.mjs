#!/usr/bin/env node
/**
 * Fail if retired Gen 2 CMS identifiers appear in runtime config, secrets template, or bindings.
 *
 * Usage: node scripts/verify-no-gen2-cms-references.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEPRECATED_GEN2_MARKERS, findDeprecatedGen2Marker } from './lib/gen1-cms-ssot.mjs';

const repoRoot = join(import.meta.dirname, '..');

const SCAN_FILES = [
  'public/runtime-config.js',
  'secrets/templates/user-secrets.template.json',
  'infrastructure/gen1-production-bindings.json',
  'infrastructure/amplify-branch-env.manifest.json',
  'src/app/amplify-config.ts',
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

for (const relativePath of SCAN_FILES) {
  const absolutePath = join(repoRoot, relativePath);
  let contents;
  try {
    contents = readFileSync(absolutePath, 'utf8');
  } catch {
    continue;
  }
  const marker = findDeprecatedGen2Marker(contents);
  if (marker) {
    fail(`${relativePath} contains deprecated Gen 2 marker "${marker}"`);
  }
}

for (const marker of DEPRECATED_GEN2_MARKERS) {
  if (marker === 'amplify_outputs.json' || marker === 'ampx pipeline-deploy') {
    continue;
  }
}

console.log('OK: no deprecated Gen 2 CMS identifiers in scanned files');
