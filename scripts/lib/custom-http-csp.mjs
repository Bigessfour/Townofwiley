import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} text
 * @param {string} [label]
 */
export function extractCspValueFromCustomHttpText(text, label = 'customHttp.yml') {
  const re = /['"]Content-Security-Policy['"]\s*\n\s*value:\s*"([^"]*)"/;
  const m = text.match(re);
  if (!m) {
    throw new Error(`${label}: could not find Content-Security-Policy value: "..." line`);
  }
  return m[1];
}

/**
 * @param {string} [repoRoot]
 */
export function extractCspValueFromCustomHttpFile(repoRoot = join(import.meta.dirname, '..', '..')) {
  const text = readFileSync(join(repoRoot, 'customHttp.yml'), 'utf8');
  return extractCspValueFromCustomHttpText(text);
}
