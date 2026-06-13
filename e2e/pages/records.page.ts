import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class RecordsPage extends PublicRoutePage {
  readonly recordsAssistance: Locator;

  constructor(page: Page) {
    super(page, '/records');
    this.recordsAssistance = page.getByTestId('contact-administration');
  }
}
