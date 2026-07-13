#!/usr/bin/env node
/**
 * stdio MCP server launcher for townofwiley-rag (JS local implementation).
 * Set TOW_RAG_ROOT to point at this monorepo when launched from another cwd.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(repoRoot, 'rag', 'js', 'mcp-server.mjs');

const child = spawn(process.execPath, [entry], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    TOW_RAG_ROOT: process.env.TOW_RAG_ROOT || repoRoot,
  },
});

child.on('exit', (code) => process.exit(code ?? 1));
