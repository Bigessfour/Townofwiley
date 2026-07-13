/**
 * Normalize Ollama / CI log text for prompts and JSON artifacts.
 */

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;]*[A-Za-z]/g;
const C1_RE = /\u009b[0-9;]*[A-Za-z]/g;

/**
 * @param {string} text
 * @returns {string}
 */
export function stripAnsi(text) {
  return text.replace(ANSI_RE, '').replace(C1_RE, '');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function collapseWhitespace(text) {
  return text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeModelOutput(text) {
  return collapseWhitespace(stripAnsi(text));
}