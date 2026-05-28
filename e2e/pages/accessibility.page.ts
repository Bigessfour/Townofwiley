import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class AccessibilityPage extends PublicRoutePage {
  readonly barrierReport: Locator;
  readonly reportAction: Locator;

  constructor(page: Page) {
    super(page, '/accessibility');
    this.barrierReport = page.locator('#barrier-report');
    this.reportAction = page.locator('#barrier-report .accessibility-action');
  }
}
