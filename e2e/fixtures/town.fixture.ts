import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';
import { mockDirectNwsRoutes } from '../support/weather-mocks';

interface TownFixtures {
  homePage: HomePage;
}

export const test = base.extend<TownFixtures>({
  homePage: async ({ page, baseURL }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('tow-site-language', 'en');
    });

    await mockDirectNwsRoutes(page);
    await use(new HomePage(page, baseURL ?? 'http://127.0.0.1:4200'));
  },
});

export { expect };
