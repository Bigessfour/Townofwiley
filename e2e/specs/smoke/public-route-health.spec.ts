import { expect, test } from '../../fixtures/town.fixture';
import { publicRouteContracts } from '../../support/public-routes';

test.describe('public route health', () => {
  for (const routeContract of publicRouteContracts) {
    test(`loads ${routeContract.label} without route or asset failures`, async ({ homePage }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedFirstPartyResponses: string[] = [];
      const baseOrigin = new URL(homePage.baseURL).origin;

      homePage.page.on('pageerror', (error) => {
        pageErrors.push(error.message);
      });

      homePage.page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      homePage.page.on('response', (response) => {
        const responseUrl = response.url();
        const resourceType = response.request().resourceType();
        const isFirstParty = responseUrl.startsWith(baseOrigin);
        const isCriticalResource = [
          'document',
          'script',
          'stylesheet',
          'image',
          'font',
          'fetch',
          'xhr',
        ].includes(resourceType);

        if (isFirstParty && isCriticalResource && response.status() >= 400) {
          failedFirstPartyResponses.push(`${response.status()} ${resourceType} ${responseUrl}`);
        }
      });

      await homePage.page.goto(routeContract.path, { waitUntil: 'domcontentloaded' });

      const heading = homePage.page.getByRole('heading', { name: routeContract.heading }).first();
      await expect(heading).toBeVisible({ timeout: 20000 });
      await expect(homePage.page.locator('#main-content')).toBeVisible();

      if (routeContract.standardShell !== false) {
        await expect(homePage.page.locator('a.town-logo[href]')).toBeAttached();
        await expect(homePage.page.locator('.site-footer')).toBeVisible();
      }

      if (routeContract.primaryAction) {
        await expect(routeContract.primaryAction(homePage.page)).toBeVisible();
      }

      await homePage.page.reload({ waitUntil: 'domcontentloaded' });
      await expect(heading).toBeVisible({ timeout: 20000 });

      expect(pageErrors, `${routeContract.label} page errors`).toEqual([]);
      expect(consoleErrors, `${routeContract.label} console errors`).toEqual([]);
      expect(
        failedFirstPartyResponses,
        `${routeContract.label} failed first-party responses`,
      ).toEqual([]);
    });
  }
});
