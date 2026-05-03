import { test, expect } from '../../fixtures/town.fixture';

const MOCK_BILL_PAY = '**/api/v1/bill-pay-requests';

async function gotoPayBillFormReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/pay-bill', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#bp-full-name')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#bp-service-address')).toBeVisible({ timeout: 10000 });
}

async function mockBillPaySuccess(page: import('@playwright/test').Page): Promise<void> {
  await page.route(MOCK_BILL_PAY, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'e2e-bill-pay-1' }),
    });
  });
}

async function mockBillPayFailure(page: import('@playwright/test').Page): Promise<void> {
  await page.route(MOCK_BILL_PAY, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
  });
}

test.describe('Pay bill page', () => {
  test('redirects legacy /payments to /pay-bill', async ({ homePage }) => {
    await homePage.page.goto('/payments');
    await expect(homePage.page).toHaveURL(/\/pay-bill\/?$/);
  });

  test('submits early access request when bill pay API is available', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await mockBillPaySuccess(homePage.page);
    await gotoPayBillFormReady(homePage.page);

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill Online/i }),
    ).toBeVisible();

    const form = homePage.page.locator('#bill-pay-request');
    await form.locator('#bp-full-name').fill('John Doe');
    await form.locator('#bp-service-address').fill('123 Main St, Wiley, CO 81092');
    await form.locator('#bp-email').fill('john@example.com');
    await form.locator('#bp-phone').fill('719-555-0100');
    await form.locator('#bp-preferred').click();
    await homePage.page.getByRole('option', { name: /^Email$/i }).click();
    await form
      .getByRole('checkbox', { name: /agree that the Town of Wiley may contact me/i })
      .check();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-success')).toBeVisible();
  });

  test('shows validation when consent checkbox is unchecked', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await gotoPayBillFormReady(homePage.page);

    const form = homePage.page.locator('#bill-pay-request');
    await form.locator('#bp-full-name').fill('Jane Doe');
    await form.locator('#bp-service-address').fill('456 Elm St');
    await form.locator('#bp-email').fill('jane@example.com');
    await form.locator('#bp-phone').fill('719-555-0200');
    await form.locator('#bp-preferred').click();
    await homePage.page.getByRole('option', { name: /^Phone call$/i }).click();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-warn')).toBeVisible();
  });

  test('falls back to mail client when bill pay API returns 500', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await mockBillPayFailure(homePage.page);

    await gotoPayBillFormReady(homePage.page);

    const form = homePage.page.locator('#bill-pay-request');
    await form.locator('#bp-full-name').fill('Error Test');
    await form.locator('#bp-service-address').fill('789 Oak St');
    await form.locator('#bp-email').fill('error@example.com');
    await form.locator('#bp-phone').fill('719-555-0300');
    await form.locator('#bp-preferred').click();
    await homePage.page.getByRole('option', { name: /^Email$/i }).click();
    await form
      .getByRole('checkbox', { name: /agree that the Town of Wiley may contact me/i })
      .check();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-info')).toBeVisible();
  });

  test('offers Spanish copy after switching site language', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await mockBillPaySuccess(homePage.page);
    await gotoPayBillFormReady(homePage.page);

    await homePage.clickSiteLanguage('es');

    await expect(
      homePage.page.getByRole('heading', { name: /Pague su factura de servicios en línea/i }),
    ).toBeVisible();
    await expect(homePage.page.locator('#bill-pay-request').locator('#bp-full-name')).toBeVisible();
  });
});

test.describe('pay bill without bill pay API configured', () => {
  test('shows Quick Pay placeholder when portal URL is not configured', async ({ homePage }) => {
    await gotoPayBillFormReady(homePage.page);

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill Online/i }),
    ).toBeVisible();
    await expect(
      homePage.page.getByText(/online payment link is being finalized/i),
    ).toBeVisible();
    await expect(homePage.page.getByRole('link', { name: /Open payment portal/i })).toBeVisible();
  });

  test('shows Quick Pay placeholder in Spanish after switching site language', async ({
    homePage,
  }) => {
    await gotoPayBillFormReady(homePage.page);
    await homePage.clickSiteLanguage('es');

    await expect(
      homePage.page.getByText(/El enlace de pago en línea se está finalizando/i),
    ).toBeVisible();
  });

  test('billing assistance uses mailto path and does not POST when API endpoint is absent', async ({
    homePage,
  }) => {
    let billPayPostCount = 0;
    await homePage.page.route('**/api/v1/bill-pay-requests', async (route) => {
      if (route.request().method() === 'POST') {
        billPayPostCount += 1;
      }
      await route.continue();
    });

    await gotoPayBillFormReady(homePage.page);

    const form = homePage.page.locator('#bill-pay-request');
    await form.locator('#bp-full-name').fill('Pat Resident');
    await form.locator('#bp-service-address').fill('100 Main St, Wiley, CO 81092');
    await form.locator('#bp-email').fill('pat@example.com');
    await form.locator('#bp-phone').fill('719-555-0140');
    await form.locator('#bp-preferred').click();
    await homePage.page.getByRole('option', { name: /^Email$/i }).click();
    await form
      .getByRole('checkbox', { name: /agree that the Town of Wiley may contact me/i })
      .check();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-info')).toBeVisible();
    await expect(homePage.page.getByText(/Opening your mail app/i)).toBeVisible();
    await expect(homePage.page.getByText(/Complete the message to send your request/i)).toBeVisible();
    expect(billPayPostCount).toBe(0);
  });
});
