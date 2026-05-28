import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class PermitsPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    super(page, '/permits');
    this.heading = page.getByRole('heading', { level: 1, name: /Permits & Inquiries/i });
    this.backLink = page.locator('.permits-page a.back-link');
  }
}
