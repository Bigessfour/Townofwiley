import type { Page } from '@playwright/test';

import { DOCUMENT_HUB_TITLE_EN, DOCUMENT_HUB_TITLE_ES } from '../../../src/app/document-hub/document-hub-titles';
import { expect, test } from '../../fixtures/town.fixture';

/** Spanish copy: `localStorage` must be `es` before Angular bootstraps `SiteLanguageService`. */
async function gotoDocumentHubWithSpanish(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('tow-site-language', 'es');
  });

  await page.goto('/documents', { waitUntil: 'load' });

  // If the first paint still shows English (storage race, hydration replay, etc.), fix storage
  // and reload once — cheaper and more reliable than arbitrary sleeps or a non-existent UI toggle.
  const langOk = await page.evaluate(() => {
    const stored = window.localStorage.getItem('tow-site-language');
    const docLang = document.documentElement.getAttribute('lang');
    return stored === 'es' && docLang === 'es';
  });

  if (!langOk) {
    await page.evaluate(() => window.localStorage.setItem('tow-site-language', 'es'));
    await page.reload({ waitUntil: 'load' });
  }

  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
}

test.describe('Public document hub', () => {
  test('loads hero, archive search, and section anchors', async ({ page }) => {
    await page.goto('/documents', { waitUntil: 'load' });

    await expect(page.getByTestId('document-hub-title')).toContainText(DOCUMENT_HUB_TITLE_EN);

    const search = page.getByPlaceholder(/Search agendas, minutes, or keywords/i);
    await search.fill('Agenda');
    await expect(page.locator('.document-file-title').first()).toBeVisible();

    await page.getByRole('link', { name: 'Public records and FOIA requests' }).click();
    await expect(page.locator('#records-requests')).toBeVisible();
  });

  test('switches document hub copy to Spanish', async ({ page }) => {
    await gotoDocumentHubWithSpanish(page);

    await expect(page.getByTestId('document-hub-title')).toContainText(DOCUMENT_HUB_TITLE_ES);
  });
});
