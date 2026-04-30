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
