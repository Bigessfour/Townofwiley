import { test, expect } from '@playwright/test';

test.describe('Permits Page', () => {
  test('displays clerk contact info and bilingual text', async ({ page }) => {
    await page.goto('/permits');

    // Expect heading and description
    await expect(page.getByRole('heading', { name: /Permits & Inquiries/i })).toBeVisible();
    await expect(page.getByText(/contact the Town Clerk/i)).toBeVisible();

    // Spanish
    await page.getByRole('button', { name: /español/i }).click();
    await expect(page.getByRole('heading', { name: /Permisos e Indagaciones/i })).toBeVisible();
    await expect(page.getByText(/contacte directamente al Secretario/i)).toBeVisible();

    // Clerk contact if present
    if (await page.locator('[href^="mailto:"]').count() > 0) {
      await expect(page.locator('[href^="mailto:"]')).toBeVisible();
    }
    if (await page.locator('[href^="tel:"]').count() > 0) {
      await expect(page.locator('[href^="tel:"]')).toBeVisible();
    }

    // Back link
    await page.getByRole('link', { name: /Back to Services/i }).click();
    await expect(page).toHaveURL(/services/);
  });
});
