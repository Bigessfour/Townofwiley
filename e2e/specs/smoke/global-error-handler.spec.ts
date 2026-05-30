import { expect, test } from '../../fixtures/town.fixture';

test.describe('Global Error Handler', () => {
  test('surfaces uncaught errors as a friendly toast notification', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.heroHeading).toBeVisible();

    await homePage.page.evaluate(() => {
      const error = new Error('Test uncaught application error');
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
