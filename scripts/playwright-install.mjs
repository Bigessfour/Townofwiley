#!/usr/bin/env node
/**
 * Ensures `playwright install` uses the workspace browser cache (`.playwright-browsers/`)
 * when PLAYWRIGHT_BROWSERS_PATH is unset, matching playwright.config.ts behaviour for `test`.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const extraArgs = process.argv.slice(2);

const env = { ...process.env };
if (!env.CI) {
  const raw = (env.PLAYWRIGHT_BROWSERS_PATH ?? '').trim();
  if (!raw) {
    env.PLAYWRIGHT_BROWSERS_PATH = resolve(root, '.playwright-browsers');
  }
}

const shell = process.platform === 'win32';
const result = spawnSync('npx', ['playwright', 'install', 'chromium', ...extraArgs], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell,
});

process.exit(result.status === null ? 1 : result.status);
