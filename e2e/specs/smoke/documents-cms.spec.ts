import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('Documents hub CMS snapshot', () => {
  test('shows seeded meeting guide from CMS snapshot', async ({ homePage }) => {
    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', { level: 1, name: siteContent.cmsHeadings.documentsHub }),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      homePage.page.getByRole('link', { name: 'Open document' }).first(),
    ).toBeVisible({ timeout: 20_000 });

    const meetingAccessGuide = homePage.page.locator('article', {
      hasText: 'City Council Meeting Access Guide',
    });

    await expect(meetingAccessGuide.getByRole('link', { name: 'Open document' })).toHaveAttribute(
      'href',
      '/documents/archive/city-council-meeting-access-guide.html',
    );
  });

  test('shows Spanish document title when site language is es', async ({ homePage }) => {
    await homePage.page.addInitScript(() => {
      window.localStorage.setItem('tow-site-language', 'es');
    });
    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('link', { name: 'Abrir documento' }).first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      homePage.page.getByText('Guia de acceso a reuniones del concejo municipal', { exact: false }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
