import { expect, test } from '../../fixtures/town.fixture';

test.describe('public language coverage', () => {
  test('keeps Spanish copy active across core public journeys', async ({ homePage }) => {
    test.setTimeout(120_000);
    await homePage.goto();

    await homePage.clickSiteLanguage('es');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Pueblo de Wiley' }),
    ).toBeVisible();
    await expect(homePage.page.getByRole('link', { name: 'Avisos' }).first()).toBeVisible();

    await homePage.page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.getByRole('heading', { name: /Pronostico/i }).first()).toBeVisible();
    await expect(
      homePage.page.getByRole('button', { name: 'Actualizar pronostico' }),
    ).toBeVisible();

    await homePage.enableAlertSignup('/mock-alert-signup');
    await homePage.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(homePage.weatherSignupShell).toContainText('Alertas para residentes');
    await expect(homePage.weatherSignupShell).toContainText('Idioma de la alerta');

    await homePage.page.goto('/services#payment-help', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.locator('#payment-help')).toBeVisible({ timeout: 20_000 });

    await homePage.page.goto('/pay-bill', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.getByTestId('pay-instructions-infographic')).toHaveAttribute(
      'src',
      /pay-bill-instructions-es-v2\.jpg/,
    );

    await homePage.page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page.getByTestId('contact-town-hall')).toBeVisible();

    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', {
        level: 2,
        name: 'Buscar agendas y minutas aprobadas',
      }),
    ).toBeVisible();

    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', { name: 'Cada residente debe poder usar este sitio' }),
    ).toBeVisible();

    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Noticias y anuncios del pueblo' }),
    ).toBeVisible();

    await homePage.page.goto('/contact', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', {
        level: 1,
        name: 'Telefono, correo y siguientes pasos',
      }),
    ).toBeVisible();

    await homePage.page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', { name: 'Aviso de privacidad para alertas del clima' }),
    ).toBeVisible();

    await homePage.page.goto('/history', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Historia y Relatos' }),
    ).toBeVisible();

    await homePage.page.goto('/terms', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', { name: 'Terminos de SMS para alertas del clima' }),
    ).toBeVisible();

    await homePage.clickSiteLanguage('en');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(
      homePage.page.getByRole('heading', { name: 'Weather alert SMS terms' }),
    ).toBeVisible();
  });
});
