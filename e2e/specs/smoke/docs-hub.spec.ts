import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/town.fixture';

async function gotoMeetingsWithSpanish(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('tow-site-language', 'es');
  });

  await page.goto('/meetings', { waitUntil: 'load' });

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

test.describe('Meeting documents archive', () => {
  test('redirects /documents to /meetings and shows searchable archive', async ({ page }) => {
    await page.goto('/documents', { waitUntil: 'load' });

    await expect(page).toHaveURL(/\/meetings$/);
    await expect(page.getByTestId('meeting-documents-archive')).toBeVisible();

    const search = page.getByPlaceholder(/Search agendas, minutes, or keywords/i);
    await search.fill('Agenda');
  });

  test('redirects /records to /contact with clerk assistance callout', async ({ page }) => {
    await page.goto('/records', { waitUntil: 'load' });

    await expect(page).toHaveURL(/\/contact$/);
    const recordsAssistance = page.getByTestId('contact-records-assistance');
    await expect(recordsAssistance).toBeVisible();
    await expect(recordsAssistance).toContainText('Email the Town Clerk');
    await expect(recordsAssistance.getByRole('link', { name: /Email the Town Clerk/i })).toHaveAttribute(
      'href',
      /mailto:.*@townofwiley\.gov/i,
    );
  });

  test('switches meeting archive copy to Spanish', async ({ page }) => {
    await gotoMeetingsWithSpanish(page);

    await expect(page.getByTestId('meeting-documents-archive')).toContainText(
      /Buscar agendas y minutas/i,
      { timeout: 20_000 },
    );
  });
});
