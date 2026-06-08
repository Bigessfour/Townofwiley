import { expect, test } from '../../fixtures/town.fixture';

test.describe('Global Error Handler', () => {
  test('surfaces uncaught errors as a friendly toast notification', async ({ homePage }) => {
    const hydrated = homePage.page.waitForEvent('console', {
      predicate: (msg) => msg.text().includes('Angular hydrated'),
      timeout: 30_000,
    });
    await homePage.goto();
    await expect(homePage.heroHeading).toBeVisible();
    await hydrated;

    await homePage.page.evaluate(() => {
      const error = new TypeError('Cannot read properties of undefined (reading "value")');
      error.stack =
        'TypeError: Cannot read properties of undefined (reading "value")\n    at https://www.townofwiley.gov/main-E2E.js:1:1';
      window.dispatchEvent(
        new ErrorEvent('error', {
          error,
          message: error.message,
        }),
      );
    });

    const toast = homePage.page.locator('.p-toast').filter({ hasText: 'Unexpected Error' });
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toContainText('An unexpected error occurred. Please try again');
    await expect(toast).toContainText('contact the Town Hall');
  });
});
