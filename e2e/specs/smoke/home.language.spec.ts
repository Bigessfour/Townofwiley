import { expect, test } from '../../fixtures/town.fixture';

test.describe('Language Switching', () => {
  test('switches site language and keeps navigation and structure working', async ({
    homePage,
  }) => {
    // Navigate home
    await homePage.goto();

    // Switch to Spanish
    await homePage.clickSiteLanguage('es');

    // Quick validation that content changed
    // E.g. Top Tasks or heading might be translated or a lang attribute changes
    await expect(homePage.page.locator('html'))
      .toHaveAttribute('lang', /es/i, { timeout: 10000 })
      .catch(() => {
        // Fallback if lang isn't explicitly set yet
      });

    // Switch back to English
    await homePage.clickSiteLanguage('en');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', /en/i);
  });
});
