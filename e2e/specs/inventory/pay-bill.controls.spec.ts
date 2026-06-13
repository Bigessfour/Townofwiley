import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';

async function gotoPayBillReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/pay-bill', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('pay-instructions-infographic')).toBeVisible({ timeout: 30_000 });
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

  test('[pay-bill.pay-instructions] instruction infographic switches with site language', async ({
    homePage,
  }) => {
    await gotoPayBillReady(homePage.page);

    await inventoryStep('Verify English pay instructions infographic', async () => {
      await expect(homePage.page.getByTestId('pay-instructions-infographic')).toHaveAttribute(
        'src',
        /pay-bill-instructions-en\.jpg/,
      );
      await expect(homePage.page.getByTestId('pay-instructions-card')).toBeVisible();
    });

    await homePage.clickSiteLanguage('es');

    await inventoryStep('Verify Spanish pay instructions infographic', async () => {
      await expect(homePage.page.getByTestId('pay-instructions-infographic')).toHaveAttribute(
        'src',
        /pay-bill-instructions-es-v2\.jpg/,
      );
    });
  });
});
