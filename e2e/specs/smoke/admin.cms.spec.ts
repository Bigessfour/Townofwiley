import { expect, test } from '../../fixtures/town.fixture';

test.describe('cms admin', () => {
  test('opens the direct Amplify edit page and shows all editable CMS models', async ({ homePage }) => {
    await homePage.page.goto('/admin', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.getByRole('heading', { name: 'One place to update the Town website' })).toBeVisible();
    await expect(homePage.page.getByRole('link', { name: 'Open CMS edit page' }).first()).toHaveAttribute(
      'href',
      /^https:\/\/us-east-2\.admin\.amplifyapp\.com\/admin\/login\?appId=d331voxr1fhoir&/,
    );

    await expect(
      homePage.page.getByRole('heading', {
        name: 'Every CMS model already gets CRUD from Amplify Studio and AppSync',
      }),
    ).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'SiteSettings' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'AlertBanner' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Announcement' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Event' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'OfficialContact' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'Business' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'PublicDocument' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'ExternalNewsLink' })).toBeVisible();
    await expect(homePage.page.getByRole('heading', { name: 'EmailAlias', level: 3 })).toBeVisible();
  });
});
