import { defineConfig, devices } from '@playwright/test';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { resolveE2eEnv } from './e2e/support/resolve-e2e-env';

/**
 * Cursor/IDE sandboxes often set PLAYWRIGHT_BROWSERS_PATH to a per-session cache that
 * is empty; default to the same cache CI uses so `playwright install` is one-time per version.
 */
const browsersPathRaw = (process.env.PLAYWRIGHT_BROWSERS_PATH ?? '').trim();
const browsersPathEphemeral =
  Boolean(browsersPathRaw) &&
  !process.env.CI &&
  /cursor-sandbox|sandbox-cache/i.test(browsersPathRaw);
if (!process.env.CI && (!browsersPathRaw || browsersPathEphemeral)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(homedir(), '.cache', 'ms-playwright');
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

// #region agent log
if (process.env.TEST_WORKER_INDEX === undefined) {
  void fetch('http://127.0.0.1:7345/ingest/eac5e3fa-05c6-4855-baef-f3904c9e52e0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '615d74' },
    body: JSON.stringify({
      sessionId: '615d74',
      hypothesisId: 'H1,H3,H4',
      location: 'playwright.config.ts:webServer',
      message: 'playwright parent: execPath and webServer preview',
      data: {
        pid: process.pid,
        node: process.version,
        execPath: process.execPath,
        e2eNodeBin,
        useRemoteBaseUrl,
        baseURL,
        e2ePort,
        webServerPreview: webServerCommand.slice(0, 320),
        webServerLen: webServerCommand.length,
        ci: Boolean(process.env.CI),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => undefined);
}
// #endregion

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
    trace: 'retain-on-failure',
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
