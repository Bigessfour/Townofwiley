#!/usr/bin/env node
/**
 * Write deterministic CI failure facts JSON for Ollama triage.
 *
 * Usage: node scripts/extract-ci-failure-facts.mjs <raw-log-file> <out-json> [snapshot-dir]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { extractCiFailureFacts } from './lib/ci-failure-facts.mjs';

const rawPath = process.argv[2];
const outPath = process.argv[3];
const snapshotDir = process.argv[4];

if (!rawPath || !outPath) {
  console.error('Usage: node scripts/extract-ci-failure-facts.mjs <raw-log> <out-json> [snapshot-dir]');
  process.exit(1);
}

let snapshotText = '';
if (snapshotDir && existsSync(snapshotDir)) {
  for (const name of readdirSync(snapshotDir)) {
    const full = join(snapshotDir, name);
    try {
      snapshotText += `\n--- ${name} ---\n${readFileSync(full, 'utf8')}`;
    } catch {
      /* binary or unreadable */
    }
  }
}

const rawLogs = readFileSync(rawPath, 'utf8');
const facts = extractCiFailureFacts(rawLogs, { snapshotText });
writeFileSync(outPath, `${JSON.stringify({ schema: 'townofwiley-ci-failure-facts-v1', ...facts }, null, 2)}\n`, 'utf8');
console.log(facts.summary);