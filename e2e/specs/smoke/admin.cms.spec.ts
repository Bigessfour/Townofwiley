import { expect, test } from '../../fixtures/town.fixture';
import { disableE2eStaffAuth, enableE2eStaffAuth } from '../../support/admin-staff-auth';

/** Gen 1 AppSync Queries console URL for Advanced (IT) section only. */
const IT_CONSOLE_EDITOR_HREF =
  /appsync\/home\?region=us-east-2#\/j7b2x3sh7rcezekekkxxiak7hi\/v1\/queries/;

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

  test('staff login page shows Hosted UI redirect status', async ({ homePage }) => {
    await disableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.getByRole('heading', { name: /Sign in — Town admin/i })).toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(homePage.page.getByTestId('admin-login-status')).toContainText(
      /Redirecting to Town sign-in/i,
    );
    await expect(homePage.page.getByRole('heading', { name: /how to sign in/i })).toBeVisible();
  });

  test('admin hub requires staff sign-in when bypass is disabled', async ({ homePage }) => {
    await disableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page).toHaveURL(/\/admin\/login\?returnUrl=/);
    await expect(homePage.page.getByTestId('admin-login-status')).toBeVisible();
  });

  test('admin hub shows task cards without AppSync jargon on the main view', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await expect(
      homePage.page.getByRole('heading', { name: /What do you want to update\?/i }),
    ).toBeVisible();
    await expect(homePage.page.getByTestId('cms-task-post-notice')).toBeVisible();
    const editNotice = homePage.page.getByTestId('cms-task-edit-post-notice');
    await expect(editNotice).toHaveRole('button');
    await editNotice.click();
    await expect(homePage.page.getByTestId('cms-task-guide')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-task-form')).toBeVisible();
    await expect(
      homePage.page
        .getByTestId('cms-task-guide')
        .getByRole('heading', { name: /Edit:\s*Post news or notice/i }),
    ).toBeVisible();
    await expect(homePage.page.locator('#cms-field-post-notice-title')).toBeVisible();
    // Task cards should not push raw "AppSync" as jargon.
    await expect(
      homePage.page.locator('.cms-task-card').getByText('AppSync', { exact: false }),
    ).not.toBeVisible();
    await expect(homePage.page.getByTestId('cms-site-status')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-force-refresh')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-content-source')).toBeVisible();
  });

  test('edit-site-copy task opens SiteCopy editor without load error', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await homePage.page.getByTestId('cms-task-edit-edit-site-copy').click();
    await expect(homePage.page.getByTestId('cms-task-guide')).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', {
        name: /Edit: Edit navigation labels, headings, and Quick Tasks text/i,
      }),
    ).toBeVisible();
    await expect(homePage.page.getByTestId('cms-record-editor')).toBeVisible();
    await expect(homePage.page.getByText(/Could not list SiteCopy/i)).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(homePage.page.locator('#cms-field-edit-site-copy-key')).toBeVisible();
    await expect(homePage.page.getByText('Loading saved records…')).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test('admin hub shows email forwarding task with dedicated editor', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    const emailTask = homePage.page.getByTestId('cms-task-manage-email-aliases');
    await expect(emailTask).toBeVisible();
    await expect(
      emailTask.getByRole('heading', { name: /Manage email forwarding/i }),
    ).toBeVisible();
    await expect(emailTask.getByRole('link', { name: /See on website/i })).toHaveCount(0);

    await homePage.page.getByTestId('cms-task-edit-manage-email-aliases').click();
    await expect(homePage.page.getByTestId('cms-task-guide')).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', { name: /Edit: Manage email forwarding/i }),
    ).toBeVisible();
    await expect(homePage.page.getByTestId('cms-email-alias-editor-slot')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-email-alias-admin')).toBeVisible();
    await expect(homePage.page.getByText('Loading forwarding rules…')).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(homePage.page.getByTestId('cms-email-alias-table')).toBeVisible();
    await expect(homePage.page.getByText('No forwarding rules saved yet.')).toBeVisible();
    await expect(homePage.page.getByTestId('cms-email-alias-add')).toBeVisible();
    await expect(homePage.page.locator('#cms-field-post-notice-title')).toHaveCount(0);
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
    await expect(homePage.page.getByTestId('cms-snapshot-open-editor')).toBeVisible({
      timeout: 20_000,
    });
    await expect(homePage.page.getByTestId('cms-snapshot-open-editor')).toHaveAttribute(
      'href',
      IT_CONSOLE_EDITOR_HREF,
    );
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

  test('preserves the legacy /clerk-setup#updates deep link to the admin start section', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#updates', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#start$/, { timeout: 20_000 });
    await expect(homePage.page.getByTestId('cms-task-hub')).toBeVisible();
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

  test('redirects legacy /admin#updates to the admin start section', async ({ homePage }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/admin#updates', { waitUntil: 'load' });

    await expect(homePage.page).toHaveURL(/\/admin#start$/, { timeout: 20_000 });
    await expect(homePage.page.getByTestId('cms-task-hub')).toBeVisible({ timeout: 20_000 });
  });

  test('meeting task exposes a working native date/time picker input', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await homePage.page.getByTestId('cms-task-edit-add-meeting').click();
    await expect(homePage.page.getByTestId('cms-task-form')).toBeVisible();
    await expect(
      homePage.page.locator('#cms-field-add-meeting-start[type="datetime-local"]'),
    ).toBeVisible();
    await expect(
      homePage.page.locator('#cms-field-add-meeting-start[type="datetime-local"]'),
    ).toBeEditable();
  });

  test('post-notice form supports newsletter PDF upload and auto-kind', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await homePage.page.getByTestId('cms-task-edit-post-notice').click();
    await expect(homePage.page.getByTestId('cms-task-form')).toBeVisible();
    await expect(
      homePage.page.getByTestId('cms-field-select-post-notice-announcementKind'),
    ).toBeVisible();
    await expect(
      homePage.page.getByTestId('cms-field-file-input-post-notice-attachmentKey'),
    ).toBeVisible();
    await expect(homePage.page.locator('#cms-field-post-notice-date')).toHaveValue(
      /\d{4}-\d{2}-\d{2}/,
    );

    const fileCode = 'documents/newsletter/2026-06-09-town-newsletter.pdf';
    await homePage.page
      .getByTestId('cms-field-file-or-url-post-notice-attachmentKey')
      .fill(fileCode);

    await expect(
      homePage.page.getByTestId('cms-field-select-post-notice-announcementKind'),
    ).toContainText(/Newsletter/i);
    await expect(homePage.page.getByText(`File code: ${fileCode}`)).toBeVisible();
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
      .getByTestId('cms-task-add-meeting')
      .getByTestId('cms-task-edit-add-meeting')
      .click();
    await expect(homePage.page.getByTestId('cms-task-form')).toBeVisible();
    await expect(
      homePage.page.getByTestId('cms-task-form').getByLabel(/Meeting or Event Title/i),
    ).toBeVisible();
  });

  test('admin hub shows recent changes panel', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await expect(homePage.page.getByTestId('cms-recent-changes')).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: /Recent changes/i })).toBeVisible();
    await expect(
      homePage.page.getByText(/No changes recorded yet|Loading recent changes/i),
    ).toBeVisible();
  });

  test('hero upload panel is visible on admin start section', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await expect(homePage.page.getByText(/homepage photo|hero photo/i).first()).toBeVisible();
    await expect(homePage.page.getByText(/Choose file|Choose PDF/i).first()).toBeVisible();
  });
});
