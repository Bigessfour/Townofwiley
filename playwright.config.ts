import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const e2ePort = process.env.E2E_PORT ?? '4300';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const useRemoteBaseUrl = Boolean(process.env.E2E_BASE_URL);
const angularCliBin = resolve(process.cwd(), 'node_modules/@angular/cli/bin/ng.js');
const runtimeConfigGenerator = resolve(process.cwd(), 'scripts/generate-runtime-config.mjs');

export default defineConfig({
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
        command: `${process.execPath} "${runtimeConfigGenerator}" && ${process.execPath} "${angularCliBin}" serve --host 127.0.0.1 --port ${e2ePort}`,
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
