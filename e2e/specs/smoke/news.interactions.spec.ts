import { expect, test } from '../../fixtures/town.fixture';

test.describe('news page interactions', () => {
  test('renders featured and external news links', async ({ homePage }) => {
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Town News and Announcements' }),
    ).toBeVisible();

    const featuredNewsCard = homePage.page.locator('.featured-news-card');
    await expect(featuredNewsCard).toContainText('Featured town notice');
    await expect(featuredNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      '/notices',
    );

    const externalNewsCard = homePage.page.locator('.news-card--external').first();
    await expect(externalNewsCard).toContainText('Lamar Ledger');
    await expect(externalNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      'https://www.lamarledger.com/',
    );
    await expect(externalNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });
});
