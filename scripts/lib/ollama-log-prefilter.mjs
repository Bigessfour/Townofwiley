/**
 * High-signal line extraction for CI logs (used by Ollama triage and unit tests).
 */

const DEFAULT_SIGNAL =
  /(?:error|fail|exception|coverage|threshold|eslint|vitest|playwright|timeout|AssertionError|::error::|exit code)/i;

/**
 * @param {string} raw
 * @param {{ maxLines?: number; signal?: RegExp }} [options]
 * @returns {string[]}
 */
export function prefilterCiLogLines(raw, options = {}) {
  const maxLines = options.maxLines ?? 400;
  const signal = options.signal ?? DEFAULT_SIGNAL;
  const lines = raw.split(/\r?\n/);
  const kept = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!signal.test(line)) {
      continue;
    }
    for (let j = Math.max(0, i - 1); j < Math.min(lines.length, i + 2); j++) {
      kept.push(lines[j]);
    }
    kept.push('---');
  }

  if (kept.length === 0) {
    return ['(no high-signal lines matched; full logs may be empty or only headers)'];
  }

  const result = [];
  let prev = null;
  for (const line of kept) {
    if (line !== prev) {
      result.push(line);
    }
    prev = line;
  }

  return result.slice(0, maxLines);
}

/**
 * @param {string} raw
 * @param {{ maxLines?: number }} [options]
 * @returns {string}
 */
export function formatPrefilteredLogs(raw, options = {}) {
  return `${prefilterCiLogLines(raw, options).join('\n')}\n`;
}