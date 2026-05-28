import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class PrivacyPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly smsTermsLink: Locator;

  constructor(page: Page) {
    super(page, '/privacy');
    this.heading = page.getByRole('heading', { level: 1, name: 'Weather alert privacy notice' });
    this.smsTermsLink = page.getByRole('link', { name: 'Weather alert SMS terms' });
  }
}
