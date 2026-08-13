import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

/** Legacy `/notices` route; waits for the unified `/news` hub after redirect. */
export class NoticesPage extends PublicRoutePage {
  readonly noticeCards: Locator;

  constructor(page: Page) {
    super(page, '/notices');
    this.noticeCards = page.locator('.notice-card');
  }

  override async goto(
    waitUntil: 'domcontentloaded' | 'commit' | 'load' = 'domcontentloaded',
  ): Promise<void> {
    await super.goto(waitUntil);
    await this.page.waitForURL(/\/news/);
  }
}
