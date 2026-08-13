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
    await expect(homePage.topTaskCards).toHaveCount(5);
    await expect(homePage.page.getByRole('link', { name: /Explore resident services/i })).toBeVisible();
    await expect(homePage.page.getByRole('link', { name: 'View meetings' })).toBeVisible();
    await expect(
      homePage.page.getByRole('link', { name: 'Accessibility statement' }),
    ).toBeVisible();
  });

  test('keeps key mobile actions reachable on the dedicated detail pages', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'mobile-chromium',
      'This spec is focused on the dedicated mobile viewport project.',
    );

    await homePage.page.goto('/weather', { waitUntil: 'domcontentloaded' });

    await expect(homePage.weatherRefreshButton).toBeVisible();
    await expect(homePage.weatherSignupSubmitButton).toBeVisible();

    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.locator('#payment-help [data-testid="resident-pay-bill-link"]')).toBeVisible();

    await homePage.page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.getByTestId('contact-town-hall')).toBeVisible();

    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.locator('#barrier-report .accessibility-action')).toBeVisible();
  });
});
