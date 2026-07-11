#!/usr/bin/env node
/**
 * Run a single Ollama generate call (non-TTY) and write sanitized output.
 *
 * Usage:
 *   node scripts/ollama-run-prompt.mjs --model llama3.2:3b --out outputs/01-triage.txt --title triage < prompt.txt
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ollamaGenerate } from './lib/ollama-api.mjs';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[index + 1];
}

const model = readArg('--model') ?? process.env.OLLAMA_MODEL ?? 'llama3.2:3b';
const outPath = readArg('--out');
const title = readArg('--title') ?? 'ollama-prompt';
const systemPath = readArg('--system');

if (!outPath) {
  console.error('--out is required');
  process.exit(1);
}

const prompt = readFileSync(0, 'utf8');
const system = systemPath ? readFileSync(systemPath, 'utf8') : undefined;

const body = await ollamaGenerate({
  model,
  prompt,
  system,
  temperature: 0.15,
  numPredict: 2400,
});

const header = [
  `# Ollama CI Diagnosis — ${title}`,
  `# Model: ${model}`,
  `# Generated: ${new Date().toISOString()}`,
  '',
].join('\n');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${header}${body}\n`, 'utf8');
process.stdout.write(body);