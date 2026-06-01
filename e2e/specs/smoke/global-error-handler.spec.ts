import { expect, test } from '../../fixtures/town.fixture';

test.describe('Global Error Handler', () => {
  test('surfaces uncaught errors as a friendly toast notification', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.heroHeading).toBeVisible();

    await homePage.page.evaluate(() => {
      const error = new TypeError('Test uncaught application error');
      error.stack =
        'TypeError: Test uncaught application error\n    at https://www.townofwiley.gov/main-E2E.js:1:1';
      setTimeout(() => {
        throw error;
      }, 250);
    });

    const toast = homePage.page.locator('.p-toast').filter({ hasText: 'Unexpected Error' });
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toContainText('An unexpected error occurred. Please try again');
    await expect(toast).toContainText('contact the Town Hall');
  });
});
