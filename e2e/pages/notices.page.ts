import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class NoticesPage extends PublicRoutePage {
  readonly noticeCards: Locator;

  constructor(page: Page) {
    super(page, '/notices');
    this.noticeCards = page.locator('.notice-card');
  }
}
