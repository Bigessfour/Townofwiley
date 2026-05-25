#!/usr/bin/env node
/**
 * Cross-platform entry for E2E smoke preflight (Windows lacks python3 on PATH).
 * Aligns PLAYWRIGHT_BROWSERS_PATH with playwright.config.ts, then runs the Python
 * preflight when available; otherwise runs critical checks in Node.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveE2eNode } from './resolve-e2e-node.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pyScript = join(repoRoot, 'scripts', 'e2e_smoke_preflight.py');
const jsonMode = process.argv.includes('--json');

function ensurePlaywrightBrowsersPath() {
  if (process.env.CI) {
    return;
  }
  const workspaceBrowsers = join(repoRoot, '.playwright-browsers');
  const raw = (process.env.PLAYWRIGHT_BROWSERS_PATH ?? '').trim();
  const ephemeral = Boolean(raw) && /cursor-sandbox|sandbox-cache/i.test(raw);
  if (!raw || ephemeral) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = workspaceBrowsers;
  }
}

function pythonCommands() {
  if (process.platform === 'win32') {
    return [
      ['py', '-3', pyScript],
      ['python', pyScript],
      ['python3', pyScript],
    ];
  }
  return [
    ['python3', pyScript],
    ['python', pyScript],
  ];
}

function runPythonPreflight() {
  const extraArgs = jsonMode ? ['--json'] : [];
  for (const cmd of pythonCommands()) {
    const [bin, ...baseArgs] = cmd;
    const result = spawnSync(bin, [...baseArgs, ...extraArgs], {
      cwd: repoRoot,
      env: { ...process.env, E2E_NODE: resolveE2eNode() },
      encoding: 'utf8',
      stdio: 'inherit',
    });
    if (result.error?.code === 'ENOENT') {
      continue;
    }
    process.exit(result.status ?? 1);
  }
  return false;
}

function allowedNodeMajors(enginesNode) {
  if (!enginesNode || typeof enginesNode !== 'string') {
    return new Set();
  }
  const majors = new Set();
  for (const match of enginesNode.matchAll(/\^(\d+)/g)) {
    majors.add(Number(match[1]));
  }
  return majors;
}

function runNodePreflight() {
  const node = resolveE2eNode();
  const rows = [];

  function row(name, detail, ok, fix = '') {
    rows.push({ name, detail, ok, fix });
  }

  const versionResult = spawnSync(node, ['-v'], { encoding: 'utf8' });
  const nodeVer = (versionResult.stdout ?? '').trim();
  let nodeMajor = null;
  if (nodeVer.startsWith('v')) {
    const parsed = Number.parseInt(nodeVer.slice(1).split('.')[0], 10);
    nodeMajor = Number.isNaN(parsed) ? null : parsed;
  }

  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  const enginesNode = pkg?.engines?.node;
  const allowed = allowedNodeMajors(enginesNode);
  const nodeOk =
    versionResult.status === 0 &&
    nodeMajor !== null &&
    (allowed.size === 0 || allowed.has(nodeMajor));
  row(
    'node',
    nodeVer || (versionResult.stderr ?? 'node not found').trim(),
    nodeOk,
    nodeOk ? '' : 'Use Node 24.x (see package.json engines and .nvmrc)',
  );

  const npmResult = spawnSync('npm', ['-v'], { cwd: repoRoot, encoding: 'utf8', shell: true });
  row(
    'npm',
    (npmResult.stdout ?? npmResult.stderr ?? '').trim(),
    npmResult.status === 0,
    'Install npm or fix PATH',
  );

  const needDirs = [
    'node_modules',
    join('node_modules', '@playwright', 'test'),
    join('node_modules', 'playwright-core'),
    join('node_modules', '@angular', 'cli'),
    join('e2e', 'specs'),
  ];
  for (const rel of needDirs) {
    const ok = existsSync(join(repoRoot, rel));
    row(`path:${rel}`, ok ? 'directory' : 'missing', ok, 'Run: npm ci');
  }

  const needFiles = ['playwright.config.ts', join('node_modules', '@angular', 'cli', 'bin', 'ng.js')];
  for (const rel of needFiles) {
    const ok = existsSync(join(repoRoot, rel));
    row(`path:${rel}`, ok ? 'file' : 'missing', ok, 'Run: npm ci');
  }

  const e2eNode = (process.env.E2E_NODE ?? '').trim();
  if (e2eNode) {
    row(
      'E2E_NODE',
      e2eNode,
      existsSync(e2eNode),
      'Point E2E_NODE at a Node binary (e.g. nvm-windows node.exe)',
    );
  }

  const chromiumSnippet = `
const fs = require('fs');
const path = require('path');
const root = process.argv[1];
let chromium;
try {
  ({ chromium } = require(path.join(root, 'node_modules', 'playwright-core')));
} catch (e) {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
}
const exe = chromium.executablePath();
if (!exe || !fs.existsSync(exe)) {
  console.error(exe || 'no chromium path');
  process.exit(1);
}
process.stdout.write(exe);
`.trim();
  const chromeResult = spawnSync(node, ['-e', chromiumSnippet, repoRoot], { encoding: 'utf8' });
  row(
    'playwright:chromium',
    chromeResult.status === 0
      ? (chromeResult.stdout ?? '').trim()
      : (chromeResult.stderr ?? 'Chromium missing').trim().slice(0, 500),
    chromeResult.status === 0,
    'Run: npm run test:e2e:install',
  );

  const failed = rows.filter((r) => !r.ok);
  if (jsonMode) {
    console.log(
      JSON.stringify(
        {
          ok: failed.length === 0,
          root: repoRoot,
          checks: rows.map(({ name, detail, ok, fix }) => ({ name, detail, ok, fix })),
        },
        null,
        2,
      ),
    );
  } else {
    const width = Math.max(...rows.map((r) => r.name.length), 10);
    for (const { name, detail, ok, fix } of rows) {
      const line = `${ok ? 'OK' : 'FAIL'}  ${name.padEnd(width)}  ${detail}`;
      console[ok ? 'log' : 'error'](line);
      if (!ok && fix) {
        console.error(`      → ${fix}`);
      }
    }
    if (failed.length) {
      console.error(
        `\ne2e_smoke_preflight: ${failed.length} check(s) failed. Fix the items above, then retry.`,
      );
    } else {
      console.log('\ne2e_smoke_preflight: all checks passed.');
    }
  }

  process.exit(failed.length ? 1 : 0);
}

ensurePlaywrightBrowsersPath();
process.env.E2E_NODE = resolveE2eNode();

/** Python subprocess on Windows often lacks nvm npm on PATH; Node checks match agent shells. */
if (process.platform === 'win32' && !process.env.CI) {
  runNodePreflight();
} else if (!runPythonPreflight()) {
  runNodePreflight();
}
