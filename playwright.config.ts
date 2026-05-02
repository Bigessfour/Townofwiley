import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { resolveE2eEnv } from './e2e/support/resolve-e2e-env';

/**
 * Local dev: keep browsers under the repo (`.playwright-browsers/`, gitignored) so
 * `playwright install` and `playwright test` share one stable path without relying on
 * shell profile or `~/.cache` permissions. CI leaves env unset (default cache on runner).
 *
 * If the environment sets PLAYWRIGHT_BROWSERS_PATH to a non-ephemeral path, it is kept.
 * Ephemeral IDE/sandbox caches are replaced with the workspace path.
 */
const workspaceBrowsersPath = resolve(process.cwd(), '.playwright-browsers');
const browsersPathRaw = (process.env.PLAYWRIGHT_BROWSERS_PATH ?? '').trim();
const browsersPathEphemeral =
  Boolean(browsersPathRaw) &&
  !process.env.CI &&
  /cursor-sandbox|sandbox-cache/i.test(browsersPathRaw);

if (process.env.CI) {
  // Use runner default or explicit CI env (e.g. cached path in workflow).
} else if (browsersPathRaw && !browsersPathEphemeral) {
  // Honor user-defined persistent location.
} else {
  process.env.PLAYWRIGHT_BROWSERS_PATH = workspaceBrowsersPath;
}

const { baseURL, useRemoteBaseUrl, e2ePort } = resolveE2eEnv();
/** Node binary for ensure / runtime config / ng serve. Use when Playwright runs under an unsupported Node (e.g. 25) but Node 24 is installed (matches .nvmrc / CI). */
const e2eNodeBin = (process.env.E2E_NODE ?? '').trim() || process.execPath;
const ensureNode = resolve(process.cwd(), 'scripts/ensure-node-version.mjs');
const angularCliBin = resolve(process.cwd(), 'node_modules/@angular/cli/bin/ng.js');
const runtimeConfigGenerator = resolve(process.cwd(), 'scripts/generate-runtime-config.mjs');

/** Polling avoids native watcher FD exhaustion on some macOS shells; optional override. */
const pollMs = (process.env.NG_SERVE_POLL_MS ?? '').trim();
const pollFlag = pollMs && /^\d+$/.test(pollMs) ? ` --poll=${pollMs}` : '';

const webServerCommand = useRemoteBaseUrl
  ? ''
  : `"${e2eNodeBin}" "${ensureNode}" && "${e2eNodeBin}" "${runtimeConfigGenerator}" && "${e2eNodeBin}" "${angularCliBin}" serve --host 127.0.0.1 --port ${e2ePort} --watch=false${pollFlag}`;

/** Full traces + screenshots for heal/debug runs (`PLAYWRIGHT_TRACE=on`). Default keeps artifacts on failure only. */
function resolveTraceMode(): 'on' | 'off' | 'on-first-retry' | 'retain-on-failure' {
  const raw = (process.env.PLAYWRIGHT_TRACE ?? '').trim().toLowerCase();
  if (raw === 'on' || raw === '1' || raw === 'true') {
    return 'on';
  }
  if (raw === 'off' || raw === '0' || raw === 'false') {
    return 'off';
  }
  return 'retain-on-failure';
}

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html'], ['list'], ['json']],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: resolveTraceMode(),
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    headless: true,
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    timezoneId: 'America/Denver',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  webServer: useRemoteBaseUrl
    ? undefined
    : {
        command: webServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1080 },
      },
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
