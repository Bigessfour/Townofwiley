import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class ServicesPage extends PublicRoutePage {
  readonly residentServices: Locator;
  readonly paymentPanel: Locator;

  constructor(page: Page) {
    super(page, '/services');
    this.residentServices = page.locator('#resident-services');
    this.paymentPanel = page.locator('#payment-help');
  }
}
