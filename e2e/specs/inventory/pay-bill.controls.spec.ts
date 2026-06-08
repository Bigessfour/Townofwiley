import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';

async function gotoPayBillFormReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/pay-bill', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bp-full-name')).toBeVisible({ timeout: 30_000 });
}

const DEFAULT_PAYSTAR_PORTAL_URL = 'https://secure.paystar.io/pay/town-of-wiley-utilitybill';

test.describe('pay bill page inventory controls', () => {
  test('[pay-bill.paystar-portal-cta-default] Paystar portal link uses the built-in default URL', async ({
    payBillPage,
  }) => {
    await payBillPage.goto();

    await inventoryStep('Verify default Paystar portal CTA href', async () => {
      await expect(payBillPage.portalCta).toBeVisible({ timeout: 20_000 });
      await expect(payBillPage.portalCta).toHaveAttribute('href', DEFAULT_PAYSTAR_PORTAL_URL);
    });
  });

  test('[pay-bill.paystar-portal-cta] Paystar portal link is exposed when configured', async ({
    homePage,
    payBillPage,
  }) => {
    await homePage.enablePaystarPortal('https://secure.paystar.io/townofwiley');
    await payBillPage.goto();

    await inventoryStep('Verify Paystar portal CTA href', async () => {
      await expect(payBillPage.portalCta).toBeVisible({ timeout: 20_000 });
      await expect(payBillPage.portalCta).toHaveAttribute(
        'href',
        'https://secure.paystar.io/townofwiley',
      );
    });
  });

  test('[pay-bill.billing-intake-validation] billing intake requires valid fields', async ({
    homePage,
  }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await gotoPayBillFormReady(homePage.page);

    await inventoryStep('Submit empty billing intake', async () => {
      await homePage.page
        .locator('#bill-pay-request')
        .getByRole('button', { name: /Submit request/i })
        .click();
    });

    await expect(homePage.page.locator('.p-toast-message-warn')).toBeVisible({
      timeout: 15_000,
    });
    await expect(homePage.page.getByText('Please review the highlighted fields.')).toBeVisible();
  });
});
