import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '4300';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const useRemoteBaseUrl = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github'], ['list']]
    : [['list'], ['html', { open: 'never' }]],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  webServer: useRemoteBaseUrl
    ? undefined
    : {
        command: `npm run start -- --host 127.0.0.1 --port ${e2ePort}`,
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
