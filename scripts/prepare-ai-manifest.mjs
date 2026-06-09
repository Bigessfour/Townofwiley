#!/usr/bin/env node
/**
 * Preflight checks before scripts/generate-ai-manifest.py runs.
 * Used by npm pregenerate:ai-manifest* hooks and the VS Code ai-manifest task.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`${cmd} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`);
  }
  return (result.stdout || '').trim();
}

function resolvePython() {
  for (const candidate of ['python', 'python3', 'py']) {
    const args = candidate === 'py' ? ['-3', '--version'] : ['--version'];
    const result = spawnSync(candidate, args, {
      cwd: repoRoot,
      encoding: 'utf-8',
      shell: process.platform === 'win32',
    });
    if (result.status === 0) {
      return candidate === 'py' ? ['py', '-3'] : [candidate];
    }
  }
  throw new Error('Python 3.10+ not found on PATH (tried python, python3, py -3)');
}

const configCandidates = [
  path.join(repoRoot, 'scripts', '.ai-manifest-config.json'),
  path.join(repoRoot, '.ai-manifest-config.json'),
];

if (!configCandidates.some((p) => existsSync(p))) {
  console.error(
    'Missing AI manifest config. Copy scripts/.ai-manifest-config.json.example to scripts/.ai-manifest-config.json',
  );
  process.exit(1);
}

try {
  run('git', ['rev-parse', '--is-inside-work-tree']);
  const python = resolvePython();
  const versionLine = run(python[0], [...python.slice(1), '--version']);
  const match = versionLine.match(/(\d+)\.(\d+)/);
  if (match) {
    const major = Number(match[1]);
    const minor = Number(match[2]);
    if (major < 3 || (major === 3 && minor < 10)) {
      throw new Error(`Python 3.10+ required; found ${versionLine}`);
    }
  }
  console.log(`AI manifest preflight OK (${versionLine}, git repo, config present)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
