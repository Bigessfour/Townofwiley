import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class RecordsPage extends PublicRoutePage {
  readonly guidePackets: Locator;

  constructor(page: Page) {
    super(page, '/records');
    this.guidePackets = page.getByTestId('records-guide-packets');
  }
}
