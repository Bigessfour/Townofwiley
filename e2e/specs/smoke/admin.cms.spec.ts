import { expect, test } from '../../fixtures/town.fixture';
import { enableE2eStaffAuth } from '../../support/admin-staff-auth';

/** Gen 2 Amplify Console Data manager (replaces Gen 1 hosted Studio). */
const CONSOLE_DATA_MANAGER_LINK = 'Open Amplify Console Data manager';
const CONSOLE_DATA_MANAGER_HREF =
  /^https:\/\/us-east-2\.console\.aws\.amazon\.com\/amplify\/apps\/d331voxr1fhoir\/branches\/(?:main|gen2-main)\/data$/;

/** PrimeNG p-tabs lazy panels and clerk-setup redirects need the app shell settled (see primeng.org/tabs). */
async function gotoAdminHub(page: import('@playwright/test').Page, path: string): Promise<void> {
  await enableE2eStaffAuth(page);
  await page.goto(path, { waitUntil: 'load' });
  await expect(page).toHaveURL(new RegExp(`${path.replace('#', '#')}$`));
  await expect(
    page.getByRole('heading', { level: 1, name: /Town of Wiley Content Management/ }),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe('cms admin', () => {
  test.describe.configure({ timeout: 90000 });

  test('staff login page shows email and password fields', async ({ homePage }) => {
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
  });

  test('opens the unified admin hub and shows all editable CMS models', async ({ homePage }) => {
    await gotoAdminHub(homePage.page, '/admin');

    await expect(
      homePage.page.getByRole('heading', { name: /Town of Wiley Content Management/ }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      homePage.page.getByRole('link', { name: CONSOLE_DATA_MANAGER_LINK }).first(),
    ).toHaveAttribute('href', CONSOLE_DATA_MANAGER_HREF);
    await expect(homePage.page.getByText('CMS Connection Status')).toBeVisible();
    await expect(homePage.page.getByRole('tab', { name: 'Setup & credentials' })).toBeVisible();
    await expect(homePage.page.getByRole('tab', { name: 'Document publishing' })).toBeVisible();
    await expect(homePage.page.getByRole('tab', { name: 'Contact updates' })).toBeVisible();

    await expect(
      homePage.page.getByRole('heading', {
        name: 'Most CMS models get normal CRUD in Amplify Studio and AppSync',
      }),
    ).toBeVisible({ timeout: 20000 });
    await expect(homePage.page.getByRole('heading', { name: 'SiteSettings' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'AlertBanner' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Announcement' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Event' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'OfficialContact' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Business' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'PublicDocument' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'ExternalNewsLink' })).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', { name: 'EmailAlias', level: 3 }),
    ).toBeVisible();
  });

  test('redirects the legacy clerk setup document link to the admin document tab', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#documents', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#documents$/, { timeout: 20_000 });
    await expect(
      homePage.page.getByRole('heading', { name: 'Supported document workflow' }),
    ).toBeVisible({ timeout: 20000 });
    await expect(homePage.page.getByText('meeting-documents')).toBeVisible();
  });

  test('preserves the legacy /clerk-setup#setup deep link to the admin setup tab', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#setup', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#setup$/, { timeout: 20_000 });
    await expect(homePage.page.getByRole('tab', { name: 'Setup & credentials' })).toBeVisible();
  });

  test('preserves the legacy /clerk-setup#updates deep link to the contact updates tab', async ({
    homePage,
  }) => {
    await enableE2eStaffAuth(homePage.page);
    await homePage.page.goto('/clerk-setup#updates', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#updates$/, { timeout: 20_000 });
    await expect(homePage.page.getByRole('tab', { name: 'Contact updates' })).toBeVisible();
  });

  test('opens directly to the documents tab when /admin#documents is loaded', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin#documents');

    await expect(homePage.page).toHaveURL(/\/admin#documents$/);
    await expect(
      homePage.page.getByRole('heading', { name: 'Supported document workflow' }),
    ).toBeVisible({ timeout: 20000 });
  });

  test('opens directly to the contact updates tab when /admin#updates is loaded', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin#updates');

    await expect(homePage.page).toHaveURL(/\/admin#updates$/);
    await expect(homePage.page.getByRole('tab', { name: 'Contact updates' })).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', { name: 'Resident contact & billing intake' }),
    ).toBeVisible({ timeout: 20000 });
  });

  test('shows contact updates error banner when review proxy returns 403', async ({ homePage }) => {
    // Same-origin default (/api/contact-updates-review) so Playwright can fulfill the request.
    await homePage.page.route('**/contact-updates-review', async (route) => {
      await route.fulfill({ status: 403, contentType: 'text/plain', body: 'Forbidden' });
    });

    await gotoAdminHub(homePage.page, '/admin#updates');

    await expect(homePage.page).toHaveURL(/\/admin#updates$/);
    await expect(
      homePage.page.locator('p-message.p-message-error, p-message[severity="error"]'),
    ).toContainText('access denied', { timeout: 20000 });
    await expect(homePage.page.getByText('No contact updates received yet.')).not.toBeVisible();
  });

  test('lists the Town newsletter section and Announcement attachmentKey guidance', async ({
    homePage,
  }) => {
    await gotoAdminHub(homePage.page, '/admin#documents');

    // Documents tab guidance lists the newsletter sectionId and S3 path (EN + ES copy duplicates labels).
    await expect(
      homePage.page.getByRole('heading', { name: 'Supported document workflow' }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      homePage.page.getByText('documents/newsletter/', { exact: false }).first(),
    ).toBeVisible();
    await expect(homePage.page.getByText(/announcementKind.*newsletter/i).first()).toBeVisible();

    // Announcement CRUD card calls out attachmentKey for the inline /news PDF.
    const announcementCard = homePage.page.locator(':is(article, section, div)', {
      has: homePage.page.getByRole('heading', { name: 'Announcement' }),
    });
    await expect(announcementCard.first()).toContainText('attachmentKey');
  });
});
