import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class ContactPage extends PublicRoutePage {
  readonly panel: Locator;
  readonly mailtoLinks: Locator;

  constructor(page: Page) {
    super(page, '/contact');
    this.panel = page.locator('#contact');
    this.mailtoLinks = page.locator('.contact-link[href^="mailto:"]');
  }
}
