import { test, expect } from '@playwright/test';

test.describe('Business Directory', () => {
  test('searches and filters businesses, bilingual support', async ({ page }) => {
    await page.goto('/businesses');

    // Expect heading
    await expect(page.getByRole('heading', { name: /Business Directory/i })).toBeVisible();

    // Search
    await page.fill('[type="search"]', 'Wiley');
    await expect(page.locator('.business-card')).toHaveCount(>0);
    await expect(page.locator('.business-card').first()).toContainText('Wiley');

    // Filter
    await page.selectOption('select', 'Retail');
    await expect(page.locator('.business-card')).toHaveCount(>0);
    await expect(page.locator('.business-card').first()).toContainText('Retail');

    // Bilingual
    await page.getByRole('button', { name: /español/i }).click();
    await expect(page.getByRole('heading', { name: /Directorio de Negocios/i })).toBeVisible();
    await page.fill('[type="search"]', 'Tienda');
    await expect(page.locator('.business-card')).toContainText('Tienda General Wiley');

    // Contact links
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();

    // No results
    await page.fill('[type="search"]', 'nonexistent');
    await expect(page.getByText(/No businesses found/i)).toBeVisible();
  });
});
