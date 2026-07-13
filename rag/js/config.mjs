/**
 * Paths, include/exclude rules for Town of Wiley JS codebase RAG.
 */
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHUNK_LINES = 80;
export const CHUNK_OVERLAP = 15;
export const MAX_FILE_BYTES = 512_000;
export const INDEX_VERSION = 1;

/** Globs relative to repo root (forward slashes). `**` matches zero or more path segments. */
export const INCLUDE_GLOBS = [
  'src/**/*.ts',
  'src/**/*.html',
  'src/**/*.scss',
  'docs/**/*.md',
  'e2e/**/*.ts',
  'e2e/**/*.mjs',
  'scripts/**/*.mjs',
  'scripts/**/*.py',
  'scripts/**/*.sh',
  'infrastructure/**/*.py',
  'infrastructure/**/*.mjs',
  'infrastructure/**/*.json',
  'infrastructure/**/*.md',
  'infrastructure/terraform/**/*.tf',
  'infrastructure/terraform/**/*.md',
  'amplify/backend/api/**/*.graphql',
  'amplify/backend/**/*.json',
  '.github/workflows/**/*.yml',
  '.github/workflows/**/*.yaml',
  '.github/actions/**/*.yml',
  '.github/actions/**/*.yaml',
  '.github/actions/**/*.md',
  '.github/instructions/**/*.md',
  '.github/copilot-instructions.md',
  '.github/skills/**/*.md',
  '.github/skills/**/*.txt',
  '.cursor/rules/**/*.mdc',
  'rag/js/**/*.mjs',
  'rag/*.md',
  'AGENTS.md',
  'Agents.md',
  'README.md',
  'llms.txt',
  'llms-full.txt',
  '.instructions.md',
  'customHttp.yml',
  'angular.json',
  'package.json',
  'docs/ci-ollama-review.md',
  'docs/DEPLOYMENT_SSOT.md',
  'infrastructure/terraform/README.md',
];

export const EXCLUDE_DIR_NAMES = new Set([
  'node_modules',
  'dist',
  '.angular',
  'coverage',
  'playwright-report',
  'test-results',
  'secrets',
  '.aws',
  '.rag',
  '.playwright-mcp',
  '.playwright-browsers',
  '__pycache__',
  '.git',
  '.venv',
  'tow_rag.egg-info',
]);

export const EXCLUDE_FILE_GLOBS = [
  'package-lock.json',
  'public/cms-snapshot.json',
  'public/runtime-config.js',
  'public/runtime-config-admin.js',
  'aws-exports.js',
  'awsconfiguration.json',
  'amplifyconfiguration.json',
  '**/*.pdf',
  '**/*.zip',
  '**/*.png',
  '**/*.jpg',
  '**/*.jpeg',
  '**/*.gif',
  '**/*.webp',
  'archive/artifacts/**',
  '**/*.log',
  '**/.env',
  '**/.env.*',
];

/**
 * Convert a gitignore-style glob (with **) to a RegExp.
 * `**` matches zero or more path segments (including none).
 * @param {string} pattern
 * @returns {RegExp}
 */
export function globToRegExp(pattern) {
  let i = 0;
  let out = '^';
  while (i < pattern.length) {
    if (pattern[i] === '*' && pattern[i + 1] === '*') {
      // ** or **/
      if (pattern[i + 2] === '/') {
        out += '(?:.*/)?';
        i += 3;
      } else {
        out += '.*';
        i += 2;
      }
      continue;
    }
    if (pattern[i] === '*') {
      out += '[^/]*';
      i += 1;
      continue;
    }
    if (pattern[i] === '?') {
      out += '[^/]';
      i += 1;
      continue;
    }
    const ch = pattern[i];
    if (/[.+^${}()|[\]\\]/.test(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
    i += 1;
  }
  out += '$';
  return new RegExp(out);
}

const includeRes = INCLUDE_GLOBS.map((g) => ({ pattern: g, re: globToRegExp(g) }));
const excludeRes = EXCLUDE_FILE_GLOBS.map((g) => ({ pattern: g, re: globToRegExp(g) }));

/**
 * @param {string} relPosix
 * @param {string} pattern
 */
export function pathMatchesGlob(relPosix, pattern) {
  return globToRegExp(pattern).test(relPosix);
}

/**
 * @param {string} startDir
 * @returns {string}
 */
export function findRepoRoot(startDir = process.cwd()) {
  const envRoot = process.env.TOW_RAG_ROOT || process.env.TOWN_OF_WILEY_ROOT;
  if (envRoot && existsSync(join(envRoot, 'package.json'))) {
    return envRoot;
  }

  let current = startDir;
  for (let depth = 0; depth < 12; depth++) {
    if (
      existsSync(join(current, 'package.json')) &&
      (existsSync(join(current, 'rag', 'js')) || existsSync(join(current, 'docs', 'codebase-rag.md')))
    ) {
      return current;
    }
    const parent = join(current, '..');
    if (parent === current) {
      break;
    }
    current = parent;
  }

  // Fallback: resolve relative to this module (rag/js/config.mjs → repo root)
  const here = fileURLToPath(new URL('.', import.meta.url));
  const fromModule = join(here, '..', '..');
  if (existsSync(join(fromModule, 'package.json'))) {
    return fromModule;
  }

  throw new Error(
    'Could not find Town of Wiley repo root (set TOW_RAG_ROOT or run from the repo).',
  );
}

/**
 * @param {string} repoRoot
 */
export function ragDir(repoRoot) {
  return join(repoRoot, '.rag');
}

/**
 * @param {string} repoRoot
 */
export function indexPath(repoRoot) {
  return join(ragDir(repoRoot), 'js-index.json');
}

/**
 * @param {string} repoRoot
 */
export function manifestPath(repoRoot) {
  return join(ragDir(repoRoot), 'js-manifest.json');
}

/**
 * @param {string} repoRoot
 * @param {string} absPath
 */
export function toRelPosix(repoRoot, absPath) {
  return relative(repoRoot, absPath).split(sep).join('/');
}

/**
 * @param {string} repoRoot
 * @param {string} absPath
 */
export function shouldIndexFile(repoRoot, absPath) {
  let rel;
  try {
    rel = toRelPosix(repoRoot, absPath);
  } catch {
    return false;
  }
  if (rel.startsWith('..')) {
    return false;
  }

  const parts = rel.split('/');
  if (parts.some((p) => EXCLUDE_DIR_NAMES.has(p))) {
    return false;
  }

  for (const { re } of excludeRes) {
    if (re.test(rel)) {
      return false;
    }
  }

  if (!includeRes.some(({ re }) => re.test(rel))) {
    return false;
  }

  try {
    const st = statSync(absPath);
    if (!st.isFile() || st.size > MAX_FILE_BYTES) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * @param {string} absPath
 */
export function languageForPath(absPath) {
  const lower = absPath.toLowerCase();
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.scss')) return 'scss';
  if (lower.endsWith('.md') || lower.endsWith('.mdc')) return 'markdown';
  if (lower.endsWith('.mjs') || lower.endsWith('.js')) return 'javascript';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.sh')) return 'shell';
  if (lower.endsWith('.graphql')) return 'graphql';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) return 'yaml';
  return 'text';
}

/**
 * @param {string} content
 */
export function contentHash(content) {
  return createHash('sha256').update(content).digest('hex');
}
