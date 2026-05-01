import { test, expect } from '@playwright/test';

test.describe('Business directory', () => {
  test('search filters listings and shows an empty state', async ({ page }) => {
    await page.goto('/businesses');

    await expect(
      page.getByRole('heading', { name: 'Wiley Community Business Directory' }),
    ).toBeVisible();

    await page.getByLabel('Search local businesses').fill('Tempel');
    await expect(page.locator('.public-directory-card').first()).toBeVisible();
    await expect(page.locator('.public-directory-card').first()).toContainText('Tempel');

    const contactLink = page
      .locator('.public-directory-card')
      .first()
      .locator('a[href^="mailto:"], a[href^="tel:"]')
      .first();
    await expect(contactLink).toBeVisible();

    await page.getByLabel('Search local businesses').fill('nonexistent-search-xyz-123');
    await expect(page.getByText(/No businesses match your search/i)).toBeVisible();
  });
});
