import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class TermsPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly privacyLink: Locator;

  constructor(page: Page) {
    super(page, '/terms');
    this.heading = page.getByRole('heading', { level: 1, name: 'Weather alert SMS terms' });
    this.privacyLink = page.getByRole('link', { name: /Weather alert privacy/i });
  }
}
