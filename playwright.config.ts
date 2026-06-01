import { defineConfig, devices } from '@playwright/test';
import os from 'node:os';
import { resolve } from 'node:path';
import { smokeCriticalGlobs } from './e2e/smoke-critical.manifest.mjs';
import { resolveE2eEnv } from './e2e/support/resolve-e2e-env';
import { resolveE2eNode } from './scripts/resolve-e2e-node.mjs';

/**
 * Playwright appends `-arm64` to the mac host key only when `os.cpus()[].model` includes
 * `"Apple"`. In sandboxes/CI, `cpus()` can be empty, so the host becomes `mac15` and
 * browser paths point at `chrome-headless-shell-mac-x64` while installs use `mac-arm64`.
 */
function ensurePlaywrightDarwinArm64Host(): void {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    return;
  }
  if (process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE?.trim()) {
    return;
  }
  const ver = os
    .release()
    .split('.')
    .map((a) => parseInt(a, 10));
  const darwinMajor = ver[0] ?? 0;
  let host: string;
  if (darwinMajor < 18) {
    host = 'mac10.13';
  } else if (darwinMajor === 18) {
    host = 'mac10.14';
  } else if (darwinMajor === 19) {
    host = 'mac10.15';
  } else {
    const lastStableMacMajor = 15;
    host = `mac${Math.min(darwinMajor - 9, lastStableMacMajor)}-arm64`;
  }
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE = host;
}

ensurePlaywrightDarwinArm64Host();

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
/** When true, do not spawn `ng serve` — use an already-running server at baseURL (e.g. `npm run serve:4300`). */
const skipLocalWebServer =
  process.env.E2E_SKIP_WEBSERVER === '1' || process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';
/** First cold Angular compile often exceeds 120s; override with PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS. */
const webServerTimeoutMs = (() => {
  const raw = (process.env.PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS ?? '').trim();
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    return n >= 30_000 && n <= 900_000 ? n : 300_000;
  }
  return 300_000;
})();
/** Node binary for ensure / runtime config / ng serve (see scripts/resolve-e2e-node.mjs). */
const e2eNodeBin = resolveE2eNode();
/** Polling avoids native watcher FD exhaustion on some macOS shells; optional override. */
const pollMs = (process.env.NG_SERVE_POLL_MS ?? '').trim();
const pollFlag = pollMs && /^\d+$/.test(pollMs) ? ` --poll=${pollMs}` : '';

/** Unix `env VAR=1 cmd` breaks Playwright webServer on Windows; use webServer.env instead. */
const e2eWebServer = resolve(process.cwd(), 'scripts/e2e-web-server.mjs');
/** Single Node entry avoids shell `&&` chains (exit 127 on Windows Playwright webServer). */
const webServerCommand = useRemoteBaseUrl
  ? ''
  : `"${e2eNodeBin}" "${e2eWebServer}" --port ${e2ePort}${pollFlag}`;
const webServerEnv: NodeJS.ProcessEnv | undefined = useRemoteBaseUrl
  ? undefined
  : {
      ...process.env,
      SKIP_NODE_VERSION_CHECK: '1',
      E2E_NODE: e2eNodeBin,
      PLAYWRIGHT_BROWSERS_PATH:
        process.env.PLAYWRIGHT_BROWSERS_PATH?.trim() || workspaceBrowsersPath,
    };

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
  webServer:
    useRemoteBaseUrl || skipLocalWebServer
      ? undefined
      : {
          command: webServerCommand,
          url: baseURL,
          reuseExistingServer: !process.env.CI && process.env.E2E_REUSE_SERVER === '1',
          timeout: webServerTimeoutMs,
          stdout: 'inherit',
          stderr: 'inherit',
          env: webServerEnv,
        },
  projects: [
    {
      name: 'smoke-critical',
      testMatch: smokeCriticalGlobs,
      timeout: 60_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1080 },
      },
    },
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
