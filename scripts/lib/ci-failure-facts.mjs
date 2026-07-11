import { stripAnsi } from './ollama-text.mjs';

/**
 * Deterministic extraction from CI logs (ground truth for Ollama triage).
 *
 * @param {string} rawLogs
 * @param {{ snapshotText?: string }} [options]
 * @returns {{
 *   failingJobs: string[];
 *   errorLines: string[];
 *   eslintErrors: { file: string; line: number; column: number; message: string }[];
 *   githubErrorAnnotations: string[];
 *   vitestFailures: string[];
 *   playwrightFailures: string[];
 *   buildErrors: string[];
 *   npmAuditFindings: string[];
 *   ciGateFailures: string[];
 *   summary: string;
 *   confidence: 'low' | 'medium' | 'high';
 *   fastPathEligible: boolean;
 *   actionable: {
 *     category: string;
 *     title: string;
 *     verifyCommands: string[];
 *     nextSteps: string[];
 *     relatedFiles: string[];
 *   };
 * }}
 */
export function extractCiFailureFacts(rawLogs, options = {}) {
  const text = stripAnsi(`${rawLogs}\n${options.snapshotText ?? ''}`);
  const lines = text.split('\n');

  const errorLines = [];
  const githubErrorAnnotations = [];
  const vitestFailures = [];
  const playwrightFailures = [];
  const buildErrors = [];
  const npmAuditFindings = [];
  const ciGateFailures = [];
  const eslintErrors = [];
  const failingJobs = new Set();
  const relatedFiles = new Set();

  const eslintFullRe = /^\s*(\/|[A-Za-z0-9_./-]+\.tsx?):\s*(\d+):(\d+)\s+error\s+(.+)$/;
  const eslintOffsetRe = /^\s*(\d+):(\d+)\s+error\s+(.+)$/;
  const ghErrorRe = /^.*##\[error\](.*)$/;
  const vitestFailRe = /Failed Tests|FAIL\s+\||^\s*FAIL\s+/;
  const playwrightRe =
    /(?:Error:\s*(?:expect\(|Timed out|Test timeout)|playwright\.|_test\.ts:|e2e\/specs\/|Timeout \d+ms exceeded)/i;
  const buildRe =
    /(?:error TS\d+|NG0\d{3}|Application bundle generation failed|✘ \[ERROR\]|Error:\s*src\/|Module not found|Cannot find module|STRICT_RUNTIME_CONFIG|Strict runtime config)/i;
  const auditRe = /(?:npm audit|severity[a-z0-9-]+|found \d+ vulnerabilities)/i;
  const gateRe = /(?:ci-gate-check|frontend-lint-build:\s*failure|CI gate)/i;
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
      relatedFiles.add(eslintMatch[1]);
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
      relatedFiles.add(lastSourceFile);
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
      if (gateRe.test(msg)) {
        ciGateFailures.push(msg);
      }
      continue;
    }

    if (vitestFailRe.test(line)) {
      vitestFailures.push(line.trim());
      errorLines.push(line.trim());
      failingJobs.add('frontend-lint-build');
    }

    if (
      /Admin runtime config failed|Cached Town of Wiley|Test timed out in \d+ms/i.test(line) ||
      (/^Error:\s+/.test(trimmed) && /spec\.ts|vitest|chromium/i.test(text))
    ) {
      errorLines.push(trimmed);
      if (/Admin runtime config failed|Test timed out|Cached Town of Wiley/i.test(line)) {
        vitestFailures.push(trimmed);
        failingJobs.add('frontend-lint-build');
      }
    }

    if (playwrightRe.test(line)) {
      playwrightFailures.push(line.trim());
      errorLines.push(line.trim());
      failingJobs.add('frontend-smoke');
      const fileMatch = line.match(/((?:e2e\/|src\/)[A-Za-z0-9_./-]+\.(?:ts|js|mjs))/);
      if (fileMatch) {
        relatedFiles.add(fileMatch[1]);
      }
    }

    if (buildRe.test(line)) {
      buildErrors.push(line.trim());
      errorLines.push(line.trim());
      failingJobs.add('frontend-lint-build');
      const fileMatch = line.match(/((?:src\/|scripts\/|public\/)[A-Za-z0-9_./-]+\.(?:ts|js|mjs|json))/);
      if (fileMatch) {
        relatedFiles.add(fileMatch[1]);
      }
    }

    if (auditRe.test(line) && /critical|high|vulnerabilit/i.test(line)) {
      npmAuditFindings.push(line.trim());
      errorLines.push(line.trim());
      failingJobs.add('security-audit');
    }

    if (/::error::/.test(line)) {
      const cleaned = line.replace(/^.*::error::/, '').trim();
      if (cleaned) {
        githubErrorAnnotations.push(cleaned);
        errorLines.push(cleaned);
      }
    }

    if (gateRe.test(line) && /failure|failed|error/i.test(line)) {
      ciGateFailures.push(line.trim());
    }
  }

  const uniqueErrors = [...new Set(errorLines)].slice(0, 40);

  let summary = 'No deterministic failure signature detected.';
  let confidence = /** @type {'low' | 'medium' | 'high'} */ ('low');
  let category = 'unknown';
  let title = 'Inspect failed job logs';
  /** @type {string[]} */
  let verifyCommands = [
    'npm run lint',
    'npm run test:vitest',
    'npm run test:unit:browser',
    'npm run build',
    'npm run test:e2e:smoke',
  ];
  /** @type {string[]} */
  let nextSteps = [
    'Open the failed Site CI job log and copy the first ##[error] / FAIL block.',
    'Reproduce locally with the verify commands above.',
    'Re-run Site CI after a focused fix commit.',
  ];

  if (eslintErrors.length > 0) {
    const first = eslintErrors[0];
    summary = `ESLint error at ${first.file}:${first.line}:${first.column} — ${first.message}`;
    failingJobs.add('frontend-lint-build');
    confidence = eslintErrors.length <= 3 ? 'high' : 'medium';
    category = 'eslint';
    title = `Fix ESLint in ${first.file}`;
    verifyCommands = ['npm run lint'];
    nextSteps = [
      `Open ${first.file}:${first.line} and resolve: ${first.message}`,
      'Run `npm run lint` until clean.',
      'Push and wait for site-ci / CI gate (merge required).',
    ];
  } else if (buildErrors.length > 0) {
    summary = buildErrors[0];
    confidence = /Strict runtime config|TS\d+|NG0\d{3}/i.test(buildErrors[0]) ? 'high' : 'medium';
    category = 'build';
    title = 'Fix production build / runtime-config failure';
    verifyCommands = ['npm run build'];
    nextSteps = [
      'If missing env vars: set GitHub secrets used by frontend-lint-build, or run `npm run secrets:sync-runtime` locally.',
      'If TypeScript/Angular errors: fix the cited file then `npm run build`.',
    ];
  } else if (playwrightFailures.length > 0) {
    summary = playwrightFailures[0];
    confidence = 'medium';
    category = 'playwright';
    title = 'Fix Playwright smoke failure';
    verifyCommands = ['npm run test:e2e:smoke'];
    nextSteps = [
      'Reproduce with `npm run test:e2e:smoke` (local ng serve).',
      'Inspect playwright-report/ artifact from the failed run.',
      'Prefer stable selectors and bilingual copy assertions.',
    ];
  } else if (vitestFailures.length > 0) {
    const adminRuntime = uniqueErrors.find((line) =>
      /Admin runtime config failed|Cached Town of Wiley|timed out in \d+ms/i.test(line),
    );
    summary = adminRuntime ?? vitestFailures[0];
    confidence = adminRuntime ? 'high' : 'medium';
    category = 'unit-tests';
    title = 'Fix browser unit / Vitest failure';
    verifyCommands = ['npm run test:unit:browser', 'npm run test:vitest'];
    nextSteps = [
      'Seed staff config via src/unit-test-browser-isolation.setup.ts (__TOW_RUNTIME_CONFIG_ADMIN__).',
      'Await LocalizedCmsContentStore.whenInitSettledForTests() for CMS async init.',
      'Avoid relying on public/runtime-config-admin.js being served in ng test.',
    ];
  } else if (npmAuditFindings.length > 0) {
    summary = npmAuditFindings[0];
    confidence = 'medium';
    category = 'security-audit';
    title = 'Address npm audit critical findings';
    verifyCommands = ['npm audit --audit-level=critical'];
    nextSteps = [
      'Run `npm audit --audit-level=critical` and upgrade or pin the vulnerable package.',
      'Re-run security-audit job path via an app-touching change if needed.',
    ];
  } else if (githubErrorAnnotations.length > 0) {
    summary = githubErrorAnnotations[0];
    confidence = 'medium';
    category = 'github-annotation';
    title = 'Resolve GitHub Actions error annotation';
    nextSteps = [
      `Address annotation: ${githubErrorAnnotations[0]}`,
      'Re-run the failed job after the fix.',
    ];
  } else if (ciGateFailures.length > 0) {
    summary = ciGateFailures[0];
    confidence = 'low';
    category = 'ci-gate';
    title = 'Investigate CI gate aggregation failure';
    nextSteps = [
      'Identify which needed job failed (frontend-lint-build, frontend-smoke, etc.).',
      'Fix that job first; ci-gate only aggregates results.',
    ];
  }

  const fastPathEligible =
    confidence === 'high' &&
    (eslintErrors.length > 0 ||
      (buildErrors.length > 0 && /Strict runtime config/i.test(summary)) ||
      (vitestFailures.length > 0 &&
        /Admin runtime config failed|timed out|Cached Town of Wiley/i.test(summary)));
  // Note: summary for unit-tests may be the detailed error line when recognized.

  return {
    failingJobs: [...failingJobs],
    errorLines: uniqueErrors,
    eslintErrors,
    githubErrorAnnotations: [...new Set(githubErrorAnnotations)],
    vitestFailures: [...new Set(vitestFailures)],
    playwrightFailures: [...new Set(playwrightFailures)].slice(0, 20),
    buildErrors: [...new Set(buildErrors)].slice(0, 20),
    npmAuditFindings: [...new Set(npmAuditFindings)].slice(0, 20),
    ciGateFailures: [...new Set(ciGateFailures)].slice(0, 20),
    summary,
    confidence,
    fastPathEligible,
    actionable: {
      category,
      title,
      verifyCommands,
      nextSteps,
      relatedFiles: [...relatedFiles].slice(0, 20),
    },
  };
}
