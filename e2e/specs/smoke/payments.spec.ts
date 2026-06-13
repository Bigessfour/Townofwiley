import { test, expect } from '../../fixtures/town.fixture';

async function dismissTransientCmsBanner(page: import('@playwright/test').Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: 'Dismiss notice' });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

async function gotoPayBillReady(page: import('@playwright/test').Page): Promise<void> {
  const hydrated = page.waitForEvent('console', {
    predicate: (msg) => msg.text().includes('Angular hydrated'),
    timeout: 30_000,
  });
  await page.goto('/pay-bill', { waitUntil: 'domcontentloaded' });
  await hydrated;
  await dismissTransientCmsBanner(page);
  await expect(page.getByTestId('pay-instructions-infographic')).toBeVisible({ timeout: 30_000 });
}

test.describe('Pay bill page', () => {
  test('redirects legacy /payments to /pay-bill', async ({ homePage }) => {
    await homePage.page.goto('/payments');
    await expect(homePage.page).toHaveURL(/\/pay-bill\/?$/);
  });

  test('preserves /payments redirect after switching to Spanish', async ({ homePage }) => {
    await homePage.page.goto('/');
    await homePage.clickSiteLanguage('es');

    await homePage.page.goto('/payments');
    await expect(homePage.page).toHaveURL(/\/pay-bill\/?$/);
    await expect(
      homePage.page.getByRole('heading', { name: /Pague su factura de servicios en línea/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('shows English instruction infographic and Pay Your Bill CTA when Paystar is configured', async ({
    homePage,
  }) => {
    await homePage.enablePaystarHostedWithoutPortal();
    await gotoPayBillReady(homePage.page);

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill Online/i }),
    ).toBeVisible();
    await expect(homePage.page.getByTestId('pay-instructions-infographic')).toHaveAttribute(
      'src',
      /pay-bill-instructions-en\.jpg/,
    );
    await expect(homePage.page.getByTestId('pay-bill-cta-band')).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Ready to pay?' })).toBeVisible();
  });

  test('shows Spanish instruction infographic after switching site language', async ({ homePage }) => {
    await gotoPayBillReady(homePage.page);
    await homePage.clickSiteLanguage('es');

    await expect(
      homePage.page.getByRole('heading', { name: /Pague su factura de servicios en línea/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(homePage.page.getByTestId('pay-instructions-infographic')).toHaveAttribute(
      'src',
      /pay-bill-instructions-es\.jpg/,
    );
  });
});

test.describe('pay bill without Paystar portal URL', () => {
  test('shows the disabled portal CTA fallback when no Paystar mode is configured', async ({
    homePage,
  }) => {
    await homePage.disablePaystarPortal();
    await gotoPayBillReady(homePage.page);

    await expect(homePage.page.getByTestId('pay-bill-portal-unavailable')).toBeVisible();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta-disabled')).toBeDisabled();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta')).toHaveCount(0);
  });

  test('shows placeholder note when hosted mode has no portalUrl', async ({ homePage }) => {
    await homePage.enablePaystarHostedWithoutPortal();
    await gotoPayBillReady(homePage.page);

    await expect(homePage.page.getByTestId('pay-bill-portal-placeholder')).toBeVisible();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta-disabled')).toBeDisabled();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta')).toHaveCount(0);
  });
});

test.describe('services payment panel', () => {
  test('links to /pay-bill from /services#payment-help', async ({ homePage }) => {
    await homePage.page.goto('/services#payment-help', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.locator('#payment-help')).toBeVisible({ timeout: 20_000 });
    await expect(homePage.page.getByTestId('resident-pay-bill-link')).toHaveAttribute(
      'href',
      /\/pay-bill$/,
    );
    await expect(homePage.page.locator('#bill-pay-request')).toHaveCount(0);
  });
});
