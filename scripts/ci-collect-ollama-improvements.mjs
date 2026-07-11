#!/usr/bin/env node
/**
 * Download Ollama CI diagnosis artifacts (or synthesize from failed logs) and print CI improvement suggestions.
 *
 * Usage: node scripts/ci-collect-ollama-improvements.mjs <github-actions-run-id>
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: node scripts/ci-collect-ollama-improvements.mjs <run-id>');
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY ?? execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
  encoding: 'utf8',
}).trim();

const outRoot = join(process.cwd(), 'outputs', 'ci-improvements', runId);
mkdirSync(outRoot, { recursive: true });

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function tryDownloadArtifact(name) {
  const dir = join(outRoot, name);
  mkdirSync(dir, { recursive: true });
  try {
    execFileSync('gh', ['run', 'download', runId, '-R', repo, '-n', name, '-D', dir], { stdio: 'pipe' });
    return dir;
  } catch {
    return null;
  }
}

const ollamaDir = tryDownloadArtifact(`ollama-ci-diagnosis-${runId}`);
const snapshotDir = tryDownloadArtifact(`ci-failure-snapshot-${runId}`);

const suggestions = {
  runId,
  repository: repo,
  collectedAt: new Date().toISOString(),
  sources: [],
  improvements: [],
};

function addImprovement(category, detail, priority = 'medium') {
  suggestions.improvements.push({ category, detail, priority });
}

if (ollamaDir) {
  suggestions.sources.push(`artifact:ollama-ci-diagnosis-${runId}`);
  for (const file of [
    '00-deterministic-facts.json',
    '06-actionable.json',
    'ACTIONABLE.md',
    '05-quality-review.txt',
    '03-feedback-loop.txt',
    '04-ci-improvements.json',
  ]) {
    const path = join(ollamaDir, file);
    if (existsSync(path)) {
      suggestions.sources.push(file);
      if (file.endsWith('.json')) {
        try {
          const parsed = JSON.parse(readFileSync(path, 'utf8'));
          if (Array.isArray(parsed.improvements)) {
            suggestions.improvements.push(...parsed.improvements);
          }
          if (parsed.actionable?.nextSteps) {
            for (const step of parsed.actionable.nextSteps) {
              addImprovement('actionable-next-step', step, 'high');
            }
          }
          if (parsed.actionable?.verifyCommands) {
            suggestions.verifyCommands = parsed.actionable.verifyCommands;
          }
        } catch {
          /* ignore */
        }
      }
    }
  }
  const factsPath = join(ollamaDir, '00-deterministic-facts.json');
  if (existsSync(factsPath)) {
    try {
      const facts = JSON.parse(readFileSync(factsPath, 'utf8'));
      if (facts.summary) {
        suggestions.improvements.unshift({
          category: 'deterministic',
          detail: facts.summary,
          priority: 'high',
        });
      }
      if (facts.actionable) {
        suggestions.actionable = facts.actionable;
      }
      suggestions.confidence = facts.confidence;
      suggestions.fastPathEligible = facts.fastPathEligible;
    } catch {
      /* ignore */
    }
  }

  const actionableMd = join(ollamaDir, 'ACTIONABLE.md');
  if (existsSync(actionableMd)) {
    suggestions.actionableMarkdown = readFileSync(actionableMd, 'utf8');
  }

  const feedback = join(ollamaDir, '03-feedback-loop.txt');
  if (existsSync(feedback)) {
    const text = readFileSync(feedback, 'utf8');
    for (const line of text.split('\n')) {
      if (/^CI_HARDENING:/i.test(line) || /^PREVENTION:/i.test(line)) {
        addImprovement('ollama-feedback', line.trim(), 'high');
      }
    }
  }
} else {
  suggestions.sources.push('fallback:gh-run-log-failed');
  try {
    const logs = gh(['run', 'view', runId, '-R', repo, '--log-failed']);
    writeFileSync(join(outRoot, 'failed-log-excerpt.txt'), logs.slice(-120_000), 'utf8');
    if (/Admin runtime config failed to load/i.test(logs)) {
      addImprovement(
        'unit-tests',
        'Seed __TOW_RUNTIME_CONFIG_ADMIN__ in browser unit-test setup (public/runtime-config-admin.js is not served reliably in ng test).',
        'high',
      );
    }
    if (/Test timed out in 15000ms/i.test(logs)) {
      addImprovement(
        'unit-tests',
        'Await CMS init settlement in site-cms-content specs or reduce app.spec admin route timeouts.',
        'high',
      );
    }
    if (/Cached Town of Wiley/i.test(logs)) {
      addImprovement(
        'unit-tests',
        'Expose whenInitSettledForTests() on LocalizedCmsContentStore so async initializeContentLoad finishes before assertions.',
        'high',
      );
    }
    if (/frontend-lint-build/i.test(logs)) {
      addImprovement(
        'caching',
        'Ensure Angular + npm + Playwright composite caches on all heavy jobs (see .github/instructions/github-actions-caching.instructions.md).',
        'medium',
      );
    }
  } catch (error) {
    addImprovement('diagnostics', `Could not fetch logs: ${error}`, 'low');
  }
}

if (snapshotDir) {
  suggestions.sources.push(`artifact:ci-failure-snapshot-${runId}`);
  addImprovement(
    'failure-snapshots',
    'Use step log tee into failure-context/ during the job instead of re-running npm scripts on failure().',
    'high',
  );
}

const outJson = join(outRoot, 'ci-improvement-suggestions.json');
writeFileSync(outJson, `${JSON.stringify(suggestions, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(suggestions, null, 2));
console.error(`\nWrote ${outJson}`);