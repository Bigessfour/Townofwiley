import { stripAnsi } from './ollama-text.mjs';

/**
 * Deterministic extraction from CI logs (ground truth for Ollama prompts).
 *
 * @param {string} rawLogs
 * @param {{ snapshotText?: string }} [options]
 * @returns {{
 *   failingJobs: string[];
 *   errorLines: string[];
 *   eslintErrors: { file: string; line: number; column: number; message: string }[];
 *   githubErrorAnnotations: string[];
 *   vitestFailures: string[];
 *   summary: string;
 * }}
 */
export function extractCiFailureFacts(rawLogs, options = {}) {
  const text = stripAnsi(`${rawLogs}\n${options.snapshotText ?? ''}`);
  const lines = text.split('\n');

  const errorLines = [];
  const githubErrorAnnotations = [];
  const vitestFailures = [];
  const eslintErrors = [];
  const failingJobs = new Set();

  const eslintFullRe = /^\s*(\/|[A-Za-z0-9_./-]+\.tsx?):\s*(\d+):(\d+)\s+error\s+(.+)$/;
  const eslintOffsetRe = /^\s*(\d+):(\d+)\s+error\s+(.+)$/;
  const ghErrorRe = /^.*##\[error\](.*)$/;
  const vitestFailRe = /Failed Tests|FAIL\s+\|/;
  let lastSourceFile = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Za-z0-9_./-]+\.tsx?$/.test(trimmed) && !trimmed.includes('error')) {
      lastSourceFile = trimmed.split(/\s+/)[0];
    }

    const eslintMatch = line.match(eslintFullRe);
    if (eslintMatch) {
      eslintErrors.push({
        file: eslintMatch[1],
        line: Number(eslintMatch[2]),
        column: Number(eslintMatch[3]),
        message: eslintMatch[4].trim(),
      });
      errorLines.push(line.trim());
      lastSourceFile = eslintMatch[1];
      continue;
    }

    const eslintOffset = line.match(eslintOffsetRe);
    if (eslintOffset && lastSourceFile) {
      eslintErrors.push({
        file: lastSourceFile,
        line: Number(eslintOffset[1]),
        column: Number(eslintOffset[2]),
        message: eslintOffset[3].trim(),
      });
      errorLines.push(`${lastSourceFile}:${eslintOffset[1]}:${eslintOffset[2]} ${eslintOffset[3].trim()}`);
      continue;
    }

    const ghMatch = line.match(ghErrorRe);
    if (ghMatch) {
      const msg = ghMatch[1].trim();
      githubErrorAnnotations.push(msg);
      errorLines.push(msg);
      const jobMatch = msg.match(/^([^:]+): failure/);
      if (jobMatch) {
        failingJobs.add(jobMatch[1].trim());
      }
      continue;
    }

    if (vitestFailRe.test(line)) {
      vitestFailures.push(line.trim());
      errorLines.push(line.trim());
    }

    if (/::error::/.test(line)) {
      const cleaned = line.replace(/^.*::error::/, '').trim();
      if (cleaned) {
        githubErrorAnnotations.push(cleaned);
        errorLines.push(cleaned);
      }
    }
  }

  const uniqueErrors = [...new Set(errorLines)].slice(0, 40);

  let summary = 'No deterministic failure signature detected.';
  if (eslintErrors.length > 0) {
    const first = eslintErrors[0];
    summary = `ESLint error at ${first.file}:${first.line}:${first.column} — ${first.message}`;
    failingJobs.add('frontend-lint-build');
  } else if (githubErrorAnnotations.length > 0) {
    summary = githubErrorAnnotations[0];
  } else if (vitestFailures.length > 0) {
    summary = vitestFailures[0];
    failingJobs.add('frontend-lint-build');
  }

  return {
    failingJobs: [...failingJobs],
    errorLines: uniqueErrors,
    eslintErrors,
    githubErrorAnnotations: [...new Set(githubErrorAnnotations)],
    vitestFailures: [...new Set(vitestFailures)],
    summary,
  };
}