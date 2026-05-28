import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';
import { mockWeatherProxyRoute } from '../../support/weather-mocks';

test.describe('weather page inventory controls', () => {
  test('[weather.signup-form-submit] severe weather signup submits successfully', async ({
    homePage,
    weatherPage,
  }) => {
    await homePage.enableWeatherProxy();
    await homePage.enableAlertSignup('/mock-alert-signup');
    await mockWeatherProxyRoute(homePage.page, '/mock-weather');

    await homePage.page.route('**/mock-alert-signup/subscriptions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message:
            'Thanks. Check your inbox or phone for the confirmation step before Wiley alerts begin.',
        }),
      });
    });

    await weatherPage.goto();

    await inventoryStep('Submit weather alert signup', async () => {
      await homePage.chooseWeatherSignupChannel('email');
      await homePage.submitWeatherAlertSignup('resident@example.com', 'Jordan Resident');
    });

    await expect(homePage.weatherSignupStatus).toContainText(
      'Check your inbox or phone for the confirmation step',
    );
  });

  test('[weather.refresh-forecast] refresh forecast control is enabled', async ({
    homePage,
    weatherPage,
  }) => {
    await homePage.enableWeatherProxy();
    await mockWeatherProxyRoute(homePage.page, '/mock-weather');
    await weatherPage.goto();

    await inventoryStep('Tap refresh forecast', async () => {
      await expect(weatherPage.refreshButton).toBeEnabled();
      await weatherPage.refreshButton.click();
    });
  });
});
