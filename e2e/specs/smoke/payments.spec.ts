import { test, expect } from '../../fixtures/town.fixture';

const MOCK_BILL_PAY = '**/api/v1/bill-pay-requests';

async function dismissTransientCmsBanner(page: import('@playwright/test').Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: 'Dismiss notice' });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }
}

async function gotoPayBillFormReady(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/pay-bill', { waitUntil: 'domcontentloaded' });
  await dismissTransientCmsBanner(page);
  await expect(page.locator('#bp-full-name')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#bp-service-address')).toBeVisible({ timeout: 10000 });
}

async function fillPayBillForm(
  page: import('@playwright/test').Page,
  values: {
    fullName: string;
    serviceAddress: string;
    email: string;
    phone: string;
    preferredContact: 'Email' | 'Phone call';
  },
): Promise<ReturnType<import('@playwright/test').Page['locator']>> {
  const form = page.locator('#bill-pay-request form.pay-bill-form');

  await form.getByRole('textbox', { name: /^Full name/i }).fill(values.fullName);
  await form.getByRole('textbox', { name: /^Service address/i }).fill(values.serviceAddress);
  await form.getByRole('textbox', { name: /^Email/i }).fill(values.email);
  await form.getByRole('textbox', { name: /^Phone/i }).fill(values.phone);

  await form.getByRole('button', { name: 'dropdown trigger' }).click();
  await page.getByRole('option', { name: new RegExp(`^${values.preferredContact}$`, 'i') }).click();

  await expect(form.getByRole('textbox', { name: /^Full name/i })).toHaveValue(values.fullName);
  await expect(form.getByRole('textbox', { name: /^Email/i })).toHaveValue(values.email);

  return form;
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

  test('preserves /payments redirect after switching to Spanish', async ({ homePage }) => {
    await homePage.page.goto('/');
    await homePage.clickSiteLanguage('es');

    await homePage.page.goto('/payments');
    await expect(homePage.page).toHaveURL(/\/pay-bill\/?$/);
    await expect(
      homePage.page.getByRole('heading', { name: /Pague su factura de servicios en línea/i }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('submits early access request when bill pay API is available', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await mockBillPaySuccess(homePage.page);
    await gotoPayBillFormReady(homePage.page);

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill Online/i }),
    ).toBeVisible();

    const form = await fillPayBillForm(homePage.page, {
      fullName: 'John Doe',
      serviceAddress: '123 Main St, Wiley, CO 81092',
      email: 'john@example.com',
      phone: '719-555-0100',
      preferredContact: 'Email',
    });
    await form
      .getByRole('checkbox', { name: /agree that the Town of Wiley may contact me/i })
      .check();

    const submitResponse = homePage.page.waitForResponse(
      (response) =>
        response.url().includes('/bill-pay-requests') && response.request().method() === 'POST',
    );
    await form.getByRole('button', { name: /Submit request/i }).click();
    await submitResponse;

    await expect(homePage.page.locator('.p-toast-message-success')).toBeVisible({
      timeout: 20_000,
    });
  });

  test('shows validation when consent checkbox is unchecked', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await gotoPayBillFormReady(homePage.page);

    const form = homePage.page.locator('#bill-pay-request form.pay-bill-form');
    await form.getByRole('textbox', { name: /^Full name/i }).fill('Jane Doe');
    await form.getByRole('textbox', { name: /^Service address/i }).fill('456 Elm St');
    await form.getByRole('textbox', { name: /^Email/i }).fill('jane@example.com');
    await form.getByRole('textbox', { name: /^Phone/i }).fill('719-555-0200');
    await form.getByRole('button', { name: 'dropdown trigger' }).click();
    await homePage.page.getByRole('option', { name: /^Phone call$/i }).click();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-warn')).toBeVisible();
  });

  test('falls back to mail client when bill pay API returns 500', async ({ homePage }) => {
    await homePage.enableBillPayApi('/api/v1/bill-pay-requests');
    await mockBillPayFailure(homePage.page);

    await gotoPayBillFormReady(homePage.page);

    const form = await fillPayBillForm(homePage.page, {
      fullName: 'Error Test',
      serviceAddress: '789 Oak St',
      email: 'error@example.com',
      phone: '719-555-0300',
      preferredContact: 'Email',
    });
    await form
      .getByRole('checkbox', { name: /agree that the Town of Wiley may contact me/i })
      .check();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-info')).toBeVisible({
      timeout: 15000,
    });
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
  test('shows the disabled portal CTA fallback when no Paystar mode is configured', async ({
    homePage,
  }) => {
    await gotoPayBillFormReady(homePage.page);

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill Online/i }),
    ).toBeVisible();
    await expect(homePage.page.getByTestId('pay-bill-portal-unavailable')).toBeVisible();
    await expect(homePage.page.getByTestId('pay-bill-portal-unavailable')).toContainText(
      /online payment portal is not yet active/i,
    );
    await expect(homePage.page.getByTestId('pay-bill-portal-cta-disabled')).toBeVisible();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta-disabled')).toBeDisabled();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta')).toHaveCount(0);
  });

  test('shows the disabled portal CTA fallback in Spanish after switching site language', async ({
    homePage,
  }) => {
    await gotoPayBillFormReady(homePage.page);
    await homePage.clickSiteLanguage('es');

    await expect(homePage.page.getByTestId('pay-bill-portal-unavailable')).toContainText(
      /El portal de pagos en línea aún no está disponible/i,
    );
    await expect(homePage.page.getByTestId('pay-bill-portal-cta-disabled')).toBeDisabled();
  });

  test('disables the portal CTA without a placeholder Paystar href when hosted mode has no portalUrl', async ({
    homePage,
  }) => {
    await homePage.enablePaystarHostedWithoutPortal();
    await gotoPayBillFormReady(homePage.page);

    await expect(homePage.page.getByTestId('pay-bill-portal-placeholder')).toBeVisible();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta-disabled')).toBeDisabled();
    await expect(homePage.page.getByTestId('pay-bill-portal-cta')).toHaveCount(0);
    await expect(homePage.page.locator('a[href*="paystar.io"]')).toHaveCount(0);
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

    const form = await fillPayBillForm(homePage.page, {
      fullName: 'Pat Resident',
      serviceAddress: '100 Main St, Wiley, CO 81092',
      email: 'pat@example.com',
      phone: '719-555-0140',
      preferredContact: 'Email',
    });
    await form
      .getByRole('checkbox', { name: /agree that the Town of Wiley may contact me/i })
      .check();

    await form.getByRole('button', { name: /Submit request/i }).click();

    await expect(homePage.page.locator('.p-toast-message-info')).toBeVisible();
    await expect(homePage.page.getByText(/Opening your mail app/i)).toBeVisible();
    await expect(
      homePage.page.getByText(/Complete the message to send your request/i),
    ).toBeVisible();
    expect(billPayPostCount).toBe(0);
  });
});
