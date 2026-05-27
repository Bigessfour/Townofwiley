#!/usr/bin/env node
/**
 * Cross-platform Playwright webServer entry (Windows cannot rely on shell `&&` chains).
 * Runs ensure-node, generate-runtime-config, then ng serve until killed.
 */
import { spawn, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveE2eNode } from './resolve-e2e-node.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const node = resolveE2eNode();
const portArg = process.argv.indexOf('--port');
const port = portArg >= 0 ? process.argv[portArg + 1] : '4300';
const pollArg = process.argv.find((a) => a.startsWith('--poll='));

console.error(`[e2e-web-server] node=${node} port=${port}`);

const env = { ...process.env, SKIP_NODE_VERSION_CHECK: '1' };

function runScript(relativePath, args = []) {
  const script = resolve(repoRoot, relativePath);
  const result = spawnSync(node, [script, ...args], {
    cwd: repoRoot,
    stdio: 'inherit',
    env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runScript('scripts/ensure-node-version.mjs');
runScript('scripts/generate-runtime-config.mjs');

const ng = resolve(repoRoot, 'node_modules/@angular/cli/bin/ng.js');
const serveArgs = [
  ng,
  'serve',
  '--host',
  '127.0.0.1',
  '--port',
  port,
  '--watch=false',
  ...(pollArg ? [pollArg] : []),
];

const child = spawn(node, serveArgs, { cwd: repoRoot, stdio: 'inherit', env });
child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
