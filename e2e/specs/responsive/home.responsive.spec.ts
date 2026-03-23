import { expect, test } from '../../fixtures/town.fixture';

test.describe('homepage responsive coverage', () => {
  test('keeps the homepage scannable on the mobile viewport', async ({ homePage }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'This spec is focused on the dedicated mobile viewport project.',
    );

    await homePage.goto();

    const overflowPixels = await homePage.page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });

    expect(overflowPixels).toBeLessThanOrEqual(1);
    await expect(homePage.topTaskCards).toHaveCount(4);
    await expect(homePage.page.locator('#payment-help')).toBeVisible();
    await expect(homePage.page.locator('#issue-report')).toBeVisible();
    await expect(homePage.page.locator('#records-request')).toBeVisible();
    await expect(homePage.page.locator('#barrier-report')).toBeVisible();
  });

  test('keeps key mobile actions reachable without horizontal scrolling', async ({ homePage }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'This spec is focused on the dedicated mobile viewport project.',
    );

    await homePage.goto();

    await expect(homePage.weatherRefreshButton).toBeVisible();
    await expect(homePage.page.locator('#payment-help .resident-action')).toBeVisible();
    await expect(homePage.page.locator('#records-request .resident-action')).toBeVisible();
    await expect(homePage.page.locator('#barrier-report .accessibility-action')).toBeVisible();
  });
});
