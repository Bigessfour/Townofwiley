import { test, expect } from '@playwright/test';

test.describe('Global Error Handler', () => {
  test('surfaces uncaught errors as a friendly toast notification', async ({ page }) => {
    // Go to the home page
    await page.goto('/');

    // Wait for the app to be stable
    await page.waitForSelector('app-root', { state: 'attached' });

    // Wait slightly more for the page to initialize in case zone isn't fully ready
    await page.waitForLoadState('networkidle');

    // Inject an uncaught error into the browser context.
    // Using setTimeout ensures it escapes standard event handler try/catch blocks
    // and is caught by window.onerror or Angular's Zone.js.
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Test uncaught application error');
      }, 0);
    });

    // Verify the toast message appears with the friendly fallback text
    const toast = page.locator('.p-toast-message-content');
    await expect(toast).toBeVisible();

    const summary = toast.locator('.p-toast-summary');
    await expect(summary).toHaveText('Unexpected Error');

    const detail = toast.locator('.p-toast-detail');
    await expect(detail).toContainText('An unexpected error occurred. Please try again');
  });
});
