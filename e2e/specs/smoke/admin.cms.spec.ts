import { expect, test } from '../../fixtures/town.fixture';

test.describe('cms admin', () => {
  test.describe.configure({ timeout: 90000 });

  test('opens the unified admin hub and shows all editable CMS models', async ({ homePage }) => {
    await homePage.page.goto('/admin', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', { name: /Town of Wiley Content Management/ }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      homePage.page.getByRole('link', { name: 'Open Amplify Studio Data Manager' }).first(),
    ).toHaveAttribute(
      'href',
      /^https:\/\/us-east-2\.console\.aws\.amazon\.com\/amplify\/home\?region=us-east-2#\/d331voxr1fhoir\/main\/studio\/data/,
    );
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
    await homePage.page.goto('/clerk-setup#documents', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/admin#documents$/);
    await expect(
      homePage.page.getByRole('heading', { name: 'Supported document workflow' }),
    ).toBeVisible({ timeout: 20000 });
    await expect(homePage.page.getByText('meeting-documents')).toBeVisible();
  });
});
