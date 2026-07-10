import { expect, test } from '@playwright/test';
import { publicRouteContracts } from '../../support/public-routes';

function parseRuntimeConfigJson(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not locate JSON object in runtime-config.js');
  }
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

test.describe('live hosting readiness', () => {
  test.skip(!process.env.E2E_BASE_URL, 'Set E2E_BASE_URL to validate deployed hosting.');

  for (const routeContract of publicRouteContracts) {
    test(`serves ${routeContract.label} as a hard-refreshable live route`, async ({ page }) => {
      const response = await page.goto(routeContract.path, { waitUntil: 'domcontentloaded' });

      expect(response?.ok(), `${routeContract.path} response should be OK`).toBe(true);
      await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });
      await expect(
        page.getByRole('heading', { name: routeContract.heading }).first(),
      ).toBeVisible();

      const reloadResponse = await page.reload({ waitUntil: 'domcontentloaded' });

      expect(reloadResponse?.ok(), `${routeContract.path} reload response should be OK`).toBe(true);
      await expect(
        page.getByRole('heading', { name: routeContract.heading }).first(),
      ).toBeVisible();
    });
  }

  test('serves /admin as a hard-refreshable live route', async ({ page }) => {
    const response = await page.goto('/admin', { waitUntil: 'domcontentloaded' });

    expect(response?.ok(), '/admin response should be OK').toBe(true);
    await expect(
      page.getByRole('heading', { name: /Town of Wiley Content Management/i }).first(),
    ).toBeVisible({ timeout: 20000 });

    const reload = await page.reload({ waitUntil: 'domcontentloaded' });
    expect(reload?.ok(), '/admin reload response should be OK').toBe(true);
    await expect(
      page.getByRole('heading', { name: /Town of Wiley Content Management/i }).first(),
    ).toBeVisible({ timeout: 20000 });
  });

  test('preserves the legacy /clerk-setup deep link to /admin on live hosting', async ({
    page,
  }) => {
    const response = await page.goto('/clerk-setup#documents', {
      waitUntil: 'domcontentloaded',
    });

    expect(response?.ok(), '/clerk-setup response should be OK').toBe(true);
    await expect(page).toHaveURL(/\/admin#documents$/);
  });

  test('homepage does not hit CSP inline-style blocks', async ({ page }) => {
    const violations: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        /Refused to apply inline style|Applying inline style violates/i.test(text) ||
        /cssRules/i.test(text) ||
        /Cannot read properties of null \(reading 'cssRules'\)/.test(text)
      ) {
        violations.push(text);
      }
    });
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), '/ response should be OK').toBe(true);
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 20000 });
    expect(violations, violations.join('\n') || 'no CSP inline-style violations').toEqual([]);
  });

  test('serves browser runtime config and critical public assets', async ({ request }) => {
    const runtimeConfig = await request.get('/runtime-config.js');
    expect(runtimeConfig.ok(), 'runtime-config.js should be hosted').toBe(true);
    await expect(runtimeConfig).toBeOK();

    const robots = await request.get('/robots.txt');
    await expect(robots).toBeOK();

    const sitemap = await request.get('/sitemap.xml');
    await expect(sitemap).toBeOK();

    const documentsRedirect = await request.get('/documents', { maxRedirects: 0 });
    expect(documentsRedirect.status(), '/documents should redirect to /meetings').toBe(302);
  });

  test('runtime-config.js exposes cms.appSync shape for browser CMS reads', async ({ request }) => {
    const runtimeConfig = await request.get('/runtime-config.js');
    expect(runtimeConfig.ok(), 'runtime-config.js should be hosted').toBe(true);
    const body = await runtimeConfig.text();
    const cfg = parseRuntimeConfigJson(body);
    const cms = cfg.cms as Record<string, unknown> | undefined;
    expect(cms?.provider, 'cms.provider should be set').toBe('appsync');
    const appSync = cms?.appSync as Record<string, unknown> | undefined;
    expect(appSync, 'cms.appSync object should exist').toBeTruthy();
    for (const key of ['region', 'apiEndpoint', 'apiKey'] as const) {
      expect(
        typeof appSync?.[key],
        `cms.appSync.${key} should be a string (may be empty in dev)`,
      ).toBe('string');
    }
    expect(cfg.clerkSetup, 'public runtime-config must not expose clerkSetup').toBeUndefined();
    expect(cms?.mediaUpload, 'public runtime-config must not expose cms.mediaUpload').toBeUndefined();
    expect(cms?.auditLog, 'public runtime-config must not expose cms.auditLog').toBeUndefined();
  });

  test('runtime-config-admin.js hosts staff-only clerk setup block', async ({ request }) => {
    const adminConfig = await request.get('/runtime-config-admin.js');
    expect(adminConfig.ok(), 'runtime-config-admin.js should be hosted').toBe(true);
    const body = await adminConfig.text();
    const cfg = parseRuntimeConfigJson(body);
    const clerk = cfg.clerkSetup as Record<string, unknown> | undefined;
    expect(clerk, 'admin runtime-config should include clerkSetup').toBeTruthy();
    expect(typeof clerk?.awsRegion, 'clerkSetup.awsRegion should be a string').toBe('string');
  });

  test('admin CMS connection succeeds when E2E_ASSERT_LIVE_CMS is true', async ({ page }) => {
    test.skip(
      process.env.E2E_ASSERT_LIVE_CMS !== 'true',
      'Set E2E_ASSERT_LIVE_CMS=true to run a live AppSync probe from /admin.',
    );

    const response = await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), '/admin response should be OK').toBe(true);
    await page.getByRole('button', { name: 'Test CMS Connection' }).click();
    await expect(page.getByText('Connected').first()).toBeVisible({ timeout: 45000 });
    await expect(
      page.getByText(/Homepage content is coming from Amplify Studio through AppSync/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
