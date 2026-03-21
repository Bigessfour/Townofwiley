import { test as base, expect } from '@playwright/test';
import { HomePage } from '../pages/home.page';

type TownFixtures = {
  homePage: HomePage;
};

export const test = base.extend<TownFixtures>({
  homePage: async ({ page, baseURL }, use) => {
    await use(new HomePage(page, baseURL ?? 'http://127.0.0.1:4200'));
  },
});

export { expect };
