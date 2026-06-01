import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class BusinessesPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly directoryCards: Locator;

  constructor(page: Page) {
    super(page, '/businesses');
    this.heading = page.getByRole('heading', {
      level: 1,
      name: 'Wiley Community Business Directory',
    });
    this.searchInput = page.locator('.business-directory-page input[type="search"]');
    this.directoryCards = page.locator('.public-directory-card');
  }
}
