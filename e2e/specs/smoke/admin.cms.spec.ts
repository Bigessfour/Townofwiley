import { expect, test } from '../../fixtures/town.fixture';
import { disableE2eStaffAuth, enableE2eStaffAuth } from '../../support/admin-staff-auth';

async function gotoAdminHub(page: import('@playwright/test').Page, path: string): Promise<void> {
  await enableE2eStaffAuth(page);
  await page.goto(path, { waitUntil: 'load' });
  await expect(page).toHaveURL(new RegExp(`${path.replace('#', '#')}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: /Update the Town website/i }),
  ).toBeVisible({
    timeout: 20_000,
  });
}

test.describe('cms admin', () => {
  test.describe.configure({ timeout: 90000 });

  test('staff login page shows email and password fields', async ({ homePage }) => {
    await disableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.getByRole('heading', { name: /Sign in — Town admin/i })).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(homePage.page.getByTestId('admin-login-email')).toBeVisible();
    await expect(homePage.page.getByTestId('admin-login-password')).toBeVisible();
    await expect(homePage.page.getByTestId('admin-login-submit')).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: /how to sign in/i })).toBeVisible();
    await expect(homePage.page.getByTestId('admin-login-forgot-password')).toBeVisible();
    await homePage.page.getByTestId('admin-login-forgot-password').click();
    await expect(homePage.page.getByTestId('admin-login-forgot-email')).toBeVisible();
    await expect(homePage.page.getByTestId('admin-login-forgot-submit')).toBeVisible();
  });

  test('admin hub shows task cards without AppSync jargon on the main view', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await expect(
      homePage.page.getByRole('heading', { name: /What do you want to update\?/i }),
    ).toBeVisible();
    await expect(homePage.page.getByTestId('cms-task-hub')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-task-post-notice')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-task-edit-post-notice')).toBeVisible();
    await expect(homePage.page.getByText('AppSync', { exact: false })).not.toBeVisible();
    await expect(homePage.page.getByTestId('cms-site-status')).toBeVisible();
  });

  test('Edit content opens the in-app record editor for post a notice', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await homePage.page.getByTestId('cms-task-edit-post-notice').click();
    await expect(homePage.page.getByTestId('cms-record-editor')).toBeVisible({ timeout: 20_000 });
    await expect(homePage.page.getByTestId('cms-save-record')).toBeVisible();
  });

  test('document publishing shows meeting agenda upload panel', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin#documents');

    await expect(homePage.page.getByTestId('cms-meeting-document-upload')).toBeVisible({
      timeout: 20_000,
    });
    await expect(homePage.page.getByTestId('cms-meeting-upload-event')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-meeting-upload-file')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-meeting-upload-submit')).toBeVisible();
  });

  test('content inventory is under Advanced (IT)', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin#advanced');

    await homePage.page.locator('#advanced').evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });

    await expect(
      homePage.page.getByRole('heading', { name: /Content inventory \(IT\)/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(homePage.page.getByTestId('cms-inventory-row-SiteSettings')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-snapshot-open-data-manager')).toBeVisible();
  });

  test('redirects the legacy clerk setup document link to the admin documents section', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#documents', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#documents$/, { timeout: 20_000 });
    await expect(homePage.page.getByRole('heading', { name: /Document publishing/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(homePage.page.getByText('meeting-documents')).toBeVisible();
  });

  test('preserves the legacy /clerk-setup#setup deep link to admin start section', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#setup', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#start$/, { timeout: 20_000 });
    await expect(
      homePage.page.getByRole('heading', { name: /What do you want to update\?/i }),
    ).toBeVisible();
  });

  test('preserves the legacy /clerk-setup#updates deep link to contact updates', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#updates', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#updates$/, { timeout: 20_000 });
    await expect(
      homePage.page.getByRole('heading', { name: /Resident contact and billing messages/i }),
    ).toBeVisible();
  });

  test('opens directly to the documents section when /admin#documents is loaded', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin#documents');

    await expect(homePage.page).toHaveURL(/\/admin#documents$/);
    await expect(homePage.page.getByRole('heading', { name: /Document publishing/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test('opens directly to contact updates when /admin#updates is loaded', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin#updates');

    await expect(homePage.page).toHaveURL(/\/admin#updates$/);
    await expect(
      homePage.page.getByRole('heading', { name: /Resident contact and billing messages/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('shows contact updates error banner when review proxy returns 403', async ({ homePage }) => {
    await homePage.page.addInitScript(() => {
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          contactUpdate?: { reviewApiEndpoint?: string; reviewProxyEndpoint?: string };
        };
      };
      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        contactUpdate: {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.contactUpdate ?? {}),
          reviewApiEndpoint: '',
          reviewProxyEndpoint: '/api/contact-updates-review',
        },
      };
    });
    await homePage.page.route(/contact-updates-review/, async (route) => {
      await route.fulfill({ status: 403, contentType: 'text/plain', body: 'Forbidden' });
    });

    await gotoAdminHub(homePage.page, '/admin#updates');

    await expect(homePage.page).toHaveURL(/\/admin#updates$/);
    await expect(
      homePage.page.locator('p-message.p-message-error, p-message[severity="error"]'),
    ).toContainText(/access denied|could not load|require staff sign-in/i, { timeout: 20_000 });
    await expect(homePage.page.getByText('No resident messages yet.')).not.toBeVisible();
  });

  test('document publishing lists newsletter path and task guide mentions Spanish fields', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin#documents');

    await expect(homePage.page.getByRole('heading', { name: /Document publishing/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(homePage.page.getByText('meeting-documents', { exact: false })).toBeVisible();

    await homePage.page
      .getByTestId('cms-task-add-document')
      .getByRole('button', {
        name: /show step-by-step/i,
      })
      .click();
    await expect(homePage.page.getByText(/Title \(Spanish\)/i)).toBeVisible();
  });
});
