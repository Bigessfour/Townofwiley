#!/usr/bin/env node
/**
 * Resolve the Node binary for E2E webServer and preflight (Windows/Cursor-safe).
 * Prefer E2E_NODE, npm's active binary, PATH NODE, then nvm-windows symlink.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @returns {string} Absolute path to a Node executable.
 */
export function resolveE2eNode() {
  const candidates = [process.env.E2E_NODE, process.env.npm_node_execpath, process.env.NODE]
    .map((v) => (v ?? '').trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const nvmSymlink = (process.env.NVM_SYMLINK ?? '').trim();
  if (nvmSymlink) {
    const nvmNode = join(nvmSymlink, process.platform === 'win32' ? 'node.exe' : 'node');
    if (existsSync(nvmNode)) {
      return nvmNode;
    }
  }

  if (process.platform === 'win32') {
    const defaultNvmNode = 'C:\\nvm4w\\nodejs\\node.exe';
    if (existsSync(defaultNvmNode)) {
      return defaultNvmNode;
    }
  }

  return process.execPath;
}
