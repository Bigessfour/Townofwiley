import { test, expect } from '@playwright/test';

test.describe('Public document hub', () => {
  test('loads hero, archive search, and section anchors', async ({ page }) => {
    await page.goto('/documents');

    await expect(page.getByTestId('document-hub-title')).toContainText(
      'Public meeting, finance, and code documents',
    );

    const search = page.getByPlaceholder(/Search agendas, minutes, or keywords/i);
    await search.fill('Agenda');
    await expect(page.locator('.document-file-title').first()).toBeVisible();

    await page.getByRole('link', { name: 'Public records and FOIA requests' }).click();
    await expect(page.locator('#records-requests')).toBeVisible();
  });

  test('switches document hub copy to Spanish', async ({ page }) => {
    await page.goto('/documents');
    await page.getByRole('button', { name: /español/i }).click();
    await expect(page.getByTestId('document-hub-title')).toContainText(
      'Documentos publicos de reuniones, finanzas y codigo',
    );
  });
});
