import { test, expect } from '../../fixtures/town.fixture';

const MOCK_API = '/e2e-mock-paystar';

async function mockPaystarApiSuccess(page: import('@playwright/test').Page): Promise<void> {
  await page.route(`**${MOCK_API}/receipt/**`, async (route) => {
    const url = route.request().url();
    const locale = new URL(url).searchParams.get('locale') ?? 'en';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        referenceId: 'REF-E2E-1',
        residentName: 'John Doe',
        amount: 50,
        date: '2026-05-01',
        status: 'success',
        preferredContact: 'john@example.com',
        locale,
      }),
    });
  });

  await page.route(`**${MOCK_API}`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        provider: 'paystar',
        mode: 'api',
        launchUrl: '',
        referenceId: 'REF-E2E-1',
      }),
    });
  });
}

test.describe('Payments page', () => {
  test('submits payment and shows receipt when Paystar API mode is enabled', async ({
    homePage,
  }) => {
    await homePage.enablePaystarApi(MOCK_API);
    await mockPaystarApiSuccess(homePage.page);
    await homePage.page.goto('/payments');

    await expect(
      homePage.page.getByRole('heading', { name: /Pay Your Utility Bill/i }),
    ).toBeVisible();

    await homePage.page.getByLabel(/Resident Name/i).fill('John Doe');
    await homePage.page.getByLabel(/Service Address/i).fill('123 Main St, Wiley, CO 81092');
    await homePage.page.getByLabel(/^Account Number/i).fill('ACC12345');
    await homePage.page.getByLabel(/^Amount/i).fill('50');
    await homePage.page.getByLabel(/Preferred Contact/i).fill('john@example.com');

    await homePage.page.getByRole('button', { name: /Submit Payment/i }).click();

    await expect(homePage.page.getByText(/Payment processed successfully/i)).toBeVisible();
    await expect(homePage.page.locator('#receipt-content')).toContainText('John Doe');
    await expect(homePage.page.locator('#receipt-content')).toContainText('50');
  });

  test('blocks submit and shows validation for a short account number', async ({ homePage }) => {
    await homePage.enablePaystarApi(MOCK_API);
    await homePage.page.goto('/payments');

    await homePage.page.getByLabel(/Resident Name/i).fill('Jane Doe');
    await homePage.page.getByLabel(/Service Address/i).fill('456 Elm St, Wiley, CO 81092');
    await homePage.page.getByLabel(/^Account Number/i).fill('SHORT');
    await homePage.page.getByLabel(/^Amount/i).fill('10');
    await homePage.page.getByLabel(/Preferred Contact/i).fill('jane@example.com');
    await homePage.page.getByLabel(/^Account Number/i).blur();

    await expect(homePage.page.getByText(/Invalid account number/i)).toBeVisible();
    await expect(homePage.page.getByRole('button', { name: /Submit Payment/i })).toBeDisabled();
  });

  test('shows error alert with retry after Paystar API returns 500', async ({ homePage }) => {
    await homePage.enablePaystarApi(MOCK_API);
    await homePage.page.route(`**${MOCK_API}`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
        return;
      }
      await route.continue();
    });

    await homePage.page.goto('/payments');

    await homePage.page.getByLabel(/Resident Name/i).fill('Error Test');
    await homePage.page.getByLabel(/Service Address/i).fill('789 Oak St, Wiley, CO 81092');
    await homePage.page.getByLabel(/^Account Number/i).fill('ACC789012');
    await homePage.page.getByLabel(/^Amount/i).fill('20');
    await homePage.page.getByLabel(/Preferred Contact/i).fill('error@example.com');

    await homePage.page.getByRole('button', { name: /Submit Payment/i }).click();

    await expect(homePage.page.locator('.error-alert')).toBeVisible();
    await expect(homePage.page.getByRole('button', { name: /^Retry$/i })).toBeVisible();
  });

  test('offers Spanish labels after switching site language', async ({ homePage }) => {
    await homePage.enablePaystarApi(MOCK_API);
    await mockPaystarApiSuccess(homePage.page);
    await homePage.page.goto('/payments');

    await homePage.page.locator('#site-language-es').click();

    await expect(
      homePage.page.getByRole('heading', { name: /Pague Su Factura de Servicios/i }),
    ).toBeVisible();
    await expect(homePage.page.getByLabel(/Nombre del Residente/i)).toBeVisible();
  });

  test('queues a payment in localStorage when the browser is offline', async ({ homePage }) => {
    await homePage.enablePaystarApi(MOCK_API);
    await homePage.page.goto('/payments');
    await homePage.page.context().setOffline(true);

    await homePage.page.getByLabel(/Resident Name/i).fill('Offline User');
    await homePage.page.getByLabel(/Service Address/i).fill('100 Offline Rd, Wiley, CO');
    await homePage.page.getByLabel(/^Account Number/i).fill('OFFLINE1');
    await homePage.page.getByLabel(/^Amount/i).fill('30');
    await homePage.page.getByLabel(/Preferred Contact/i).fill('offline@example.com');

    await homePage.page.getByRole('button', { name: /Submit Payment/i }).click();

    await expect(homePage.page.getByText(/queued offline/i)).toBeVisible();
    const raw = await homePage.page.evaluate(() => localStorage.getItem('pendingPayments'));
    expect(raw).toContain('OFFLINE1');

    await homePage.page.context().setOffline(false);
  });
});
