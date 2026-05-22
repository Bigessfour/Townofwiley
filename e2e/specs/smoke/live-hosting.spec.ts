import { expect, test } from '@playwright/test';
import { publicRouteContracts } from '../../support/public-routes';

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

  test('serves browser runtime config and critical public assets', async ({ request }) => {
    const runtimeConfig = await request.get('/runtime-config.js');
    expect(runtimeConfig.ok(), 'runtime-config.js should be hosted').toBe(true);
    await expect(runtimeConfig).toBeOK();

    const robots = await request.get('/robots.txt');
    await expect(robots).toBeOK();

    const sitemap = await request.get('/sitemap.xml');
    await expect(sitemap).toBeOK();

    const archiveGuide = await request.get(
      '/documents/archive/city-council-meeting-access-guide.html',
    );
    await expect(archiveGuide).toBeOK();
  });
});
