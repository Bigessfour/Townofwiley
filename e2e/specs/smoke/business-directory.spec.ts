import { test, expect } from '../../fixtures/town.fixture';

test.describe('Business directory', () => {
  test('search filters listings and shows an empty state', async ({ homePage }) => {
    await homePage.page.goto('/businesses');

    await expect(
      homePage.page.getByRole('heading', { name: 'Wiley Community Business Directory' }),
    ).toBeVisible();

    await homePage.page.getByLabel('Search local businesses').fill('Tempel Grain');
    await expect(homePage.page.locator('.public-directory-card').first()).toBeVisible();
    await expect(homePage.page.locator('.public-directory-card').first()).toContainText('Tempel Grain');

    const contactLink = homePage.page
      .locator('.public-directory-card')
      .first()
      .locator('a[href^="mailto:"], a[href^="tel:"]')
      .first();
    await expect(contactLink).toBeVisible();

    await homePage.page.getByLabel('Search local businesses').fill('nonexistent-search-xyz-123');
    await expect(homePage.page.getByText(/No businesses match your search/i)).toBeVisible({
      timeout: 20_000,
    });
  });
});
