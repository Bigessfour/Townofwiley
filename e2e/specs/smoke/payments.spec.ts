import { test, expect } from '../../fixtures/town.fixture';

const MOCK_BILL_PAY = '**/api/v1/bill-pay-requests';

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
    await homePage.page.goto('/pay-bill');

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill Online/i }),
    ).toBeVisible();

    const form = homePage.page.locator('#bill-pay-request');
    await form.getByLabel(/^Full name/i).fill('John Doe');
    await form.getByLabel(/^Service address/i).fill('123 Main St, Wiley, CO 81092');
    await form.getByLabel(/^Email/i).fill('john@example.com');
    await form.getByLabel(/^Phone/i).fill('719-555-0100');
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
    await homePage.page.goto('/pay-bill');

    const form = homePage.page.locator('#bill-pay-request');
    await form.getByLabel(/^Full name/i).fill('Jane Doe');
    await form.getByLabel(/^Service address/i).fill('456 Elm St');
    await form.getByLabel(/^Email/i).fill('jane@example.com');
    await form.getByLabel(/^Phone/i).fill('719-555-0200');
    await form.locator('#bp-preferred').click();
    await homePage.page.getByRole('option', { name: /^Phone call$/i }).click();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-warn')).toBeVisible();
  });

  test('falls back to mail client when bill pay API returns 500', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await mockBillPayFailure(homePage.page);

    await homePage.page.goto('/pay-bill');

    const form = homePage.page.locator('#bill-pay-request');
    await form.getByLabel(/^Full name/i).fill('Error Test');
    await form.getByLabel(/^Service address/i).fill('789 Oak St');
    await form.getByLabel(/^Email/i).fill('error@example.com');
    await form.getByLabel(/^Phone/i).fill('719-555-0300');
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
    await homePage.page.goto('/pay-bill');

    await homePage.clickSiteLanguage('es');

    await expect(
      homePage.page.getByRole('heading', { name: /Pague su factura de servicios en línea/i }),
    ).toBeVisible();
    await expect(
      homePage.page.locator('#bill-pay-request').getByLabel(/^Nombre completo/i),
    ).toBeVisible();
  });
});
