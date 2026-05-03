/**
 * Regression: wildcard `**` route renders NotFoundComponent in the main shell outlet with working
 * navigation back to home (Angular catch-all; see app.routes.ts).
 */
import { expect, test } from '../../fixtures/town.fixture';

const UNKNOWN_PATH = '/tow-e2e-not-found-route-404-test';

test.describe('not found (404) navigation', () => {
  test('unknown path shows not-found content and home link navigates to /', async ({ homePage }) => {
    await homePage.page.goto(UNKNOWN_PATH);
    await expect(homePage.page.getByTestId('not-found-page')).toBeVisible({ timeout: 15_000 });
    await expect(
      homePage.page.getByRole('heading', { name: /page not found|página no encontrada/i }),
    ).toBeVisible();
    const homeCta = homePage.page
      .getByTestId('not-found-page')
      .getByRole('link', { name: /return to homepage|volver a la página principal/i });
    await expect(homeCta).toBeVisible();
    await homeCta.click();
    await expect(homePage.page).toHaveURL(/\/$/);
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('desktop megamenu remains usable from a 404 page', async ({ homePage }) => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'Megamenu chrome is desktop-only in this suite.',
    );

    await homePage.page.goto(UNKNOWN_PATH);
    await expect(homePage.page.getByTestId('homepage-section-nav')).toBeVisible();
    await homePage.page.getByTestId('homepage-section-nav').getByRole('menuitem', { name: /I Want To/i }).click();
    const panel = homePage.page
      .getByTestId('homepage-section-nav')
      .locator('li.p-megamenu-item-active')
      .locator('.p-megamenu-overlay')
      .first();
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.getByRole('link', { name: /Local weather/i }).click();
    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.page.locator('#weather-heading')).toBeVisible();
  });
});
