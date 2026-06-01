import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class PayBillPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly portalCta: Locator;
  readonly portalUnavailable: Locator;

  constructor(page: Page) {
    super(page, '/pay-bill');
    this.heading = page.getByRole('heading', { level: 1, name: 'Pay Your Utility Bill Online' });
    this.portalCta = page.getByTestId('pay-bill-portal-cta');
    this.portalUnavailable = page.getByTestId('pay-bill-portal-unavailable');
  }
}
