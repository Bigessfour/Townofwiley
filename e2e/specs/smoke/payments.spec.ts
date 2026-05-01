import { test, expect } from '@playwright/test';

test.describe('Payments Module', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure English locale for base tests; Spanish variant separate
    await page.goto('/');
    // Click payments link in resident services (assuming selector from home)
    await page.getByRole('link', { name: /payments|pay/i }).click();
    // Wait for payments page to load
    await expect(page.getByRole('heading', { name: /pay your bill/i })).toBeVisible();
  });

  test('successful payment flow with receipt', async ({ page }) => {
    // Fill form with valid data
    await page.getByLabel(/resident name/i).fill('John Doe');
    await page.getByLabel(/service address/i).fill('123 Main St, Wiley, CO 81092');
    await page.getByLabel(/account number/i).fill('ACC123456');
    await page.getByLabel(/amount/i).fill('50.00');
    await page.getByLabel(/preferred contact/i).fill('john@example.com');
    await page.getByLabel(/due date/i).fill('2026-06-01'); // Future date

    // Submit
    await page.getByRole('button', { name: /submit payment/i }).click();

    // Expect loading state then success
    await expect(page.getByText(/processing/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('alert', { name: /payment successful/i })).toBeVisible();
    await expect(page.getByText(/error/i)).not.toBeVisible();

    // Receipt generation
    await page.getByRole('button', { name: /view receipt/i }).click();
    await expect(page.locator('#receipt-modal')).toBeVisible();
    await expect(page.locator('#receipt-content')).toContainText('John Doe');
    await expect(page.locator('#receipt-content')).toContainText('$50.00');
    await expect(page.locator('#receipt-content')).toContainText('Payment confirmed');
    // Download link works (check attribute)
    const downloadLink = page.locator('#receipt-download');
    await expect(downloadLink).toHaveAttribute('href', expect.stringContaining('.pdf'));
    await expect(downloadLink).toHaveAttribute('download', 'receipt.pdf');
  });

  test('invalid account error handling', async ({ page }) => {
    // Fill with invalid account
    await page.getByLabel(/resident name/i).fill('Jane Doe');
    await page.getByLabel(/service address/i).fill('456 Elm St, Wiley, CO 81092');
    await page.getByLabel(/account number/i).fill('INVALID123');
    await page.getByLabel(/amount/i).fill('10.00');
    await page.getByLabel(/preferred contact/i).fill('jane@example.com');

    // Submit
    await page.getByRole('button', { name: /submit payment/i }).click();

    // Expect error without success
    await expect(page.getByRole('alert', { name: /invalid account/i })).toBeVisible();
    await expect(page.getByRole('alert', { name: /payment successful/i })).not.toBeVisible();
    // Form retains invalid value
    await expect(page.getByLabel(/account number/i)).toHaveValue('INVALID123');
    // No receipt shown
    await expect(page.locator('#receipt-modal')).not.toBeVisible();
  });

  test('500 server error graceful handling', async ({ page, browserName }) => {
    // Fill valid form
    await page.getByLabel(/resident name/i).fill('Error Test');
    await page.getByLabel(/service address/i).fill('789 Oak St, Wiley, CO 81092');
    await page.getByLabel(/account number/i).fill('ACC789012');
    await page.getByLabel(/amount/i).fill('20.00');
    await page.getByLabel(/preferred contact/i).fill('error@example.com');

    // Mock 500 response for proxy
    await page.route('**/paystar-proxy**', async route => {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
    });

    // Submit
    await page.getByRole('button', { name: /submit payment/i }).click();

    // Expect global error handler
    await expect(page.getByRole('alert', { name: /server error.*try again/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    // No crash, form intact
    await expect(page.getByLabel(/resident name/i)).toHaveValue('Error Test');
  });

  test('bilingual payment flow (Spanish)', async ({ page }) => {
    // Switch to Spanish
    await page.getByRole('button', { name: /español/i }).click();
    await expect(page.getByText(/idioma|language/i)).toContainText(/español/i);

    // Navigate back to payments
    await page.goto('/payments'); // Assume route
    await expect(page.getByRole('heading', { name: /pague su factura/i })).toBeVisible();

    // Fill form (labels in Spanish)
    await page.getByLabel(/nombre del residente/i).fill('Juan Pérez');
    await page.getByLabel(/dirección del servicio/i).fill('123 Calle Principal, Wiley, CO 81092');
    await page.getByLabel(/número de cuenta/i).fill('ACC123456');
    await page.getByLabel(/monto/i).fill('50.00');
    await page.getByLabel(/contacto preferido/i).fill('juan@example.com');

    // Submit
    await page.getByRole('button', { name: /enviar pago/i }).click();

    // Success in Spanish
    await expect(page.getByRole('alert', { name: /pago exitoso/i })).toBeVisible();

    // Receipt in Spanish
    await page.getByRole('button', { name: /ver recibo/i }).click();
    await expect(page.locator('#receipt-content')).toContainText('Juan Pérez');
    await expect(page.locator('#receipt-content')).toContainText('Pago confirmado');
    await expect(page.locator('#receipt-content')).toContainText('recibo'); // Spanish term
  });

  test('file size limit and offline queue', async ({ page }) => {
    // Offline: Mock network disconnect during submit
    await page.route('**/*', route => route.continue());
    await page.setOffline(true);

    // Fill form
    await page.getByLabel(/resident name/i).fill('Offline User');
    await page.getByLabel(/service address/i).fill('Offline St, Wiley, CO');
    await page.getByLabel(/account number/i).fill('OFF123');
    await page.getByLabel(/amount/i).fill('30.00');
    await page.getByLabel(/preferred contact/i).fill('offline@example.com');

    // Submit offline
    await page.getByRole('button', { name: /submit payment/i }).click();

    // Expect queue notification
    await expect(page.getByRole('alert', { name: /offline.*queued/i })).toBeVisible();
    // Check localStorage for queued payment
    const storage = await page.evaluate(() => localStorage.getItem('pendingPayments'));
    expect(storage).toContain('OFF123');

    // Reconnect and sync
    await page.setOffline(false);
    await page.getByRole('button', { name: /sync pending/i }).click();
    await expect(page.getByRole('alert', { name: /synced successfully/i })).toBeVisible();
    // localStorage cleared
    const cleared = await page.evaluate(() => localStorage.getItem('pendingPayments'));
    expect(cleared).toBeNull();
  });
});
