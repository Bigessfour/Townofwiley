import { expect, test } from '../../fixtures/town.fixture';

test.describe('Meetings document archive CMS snapshot', () => {
  test('shows meeting documents archive after /documents redirect', async ({ homePage }) => {
    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page).toHaveURL(/\/meetings$/);
    await expect(homePage.page.getByTestId('meeting-documents-archive')).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      homePage.page.getByRole('heading', {
        level: 2,
        name: 'Search agendas and approved minutes',
      }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('shows Spanish archive heading when site language is es', async ({ homePage }) => {
    await homePage.page.addInitScript(() => {
      window.localStorage.setItem('tow-site-language', 'es');
    });
    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', {
        level: 2,
        name: 'Buscar agendas y minutas aprobadas',
      }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
