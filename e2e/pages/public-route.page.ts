import type { Page } from '@playwright/test';

import { SiteChromePage } from './site-chrome.page';

/** Base page object for a public route with shared site chrome. */
export class PublicRoutePage {
  readonly page: Page;
  readonly path: string;
  readonly chrome: SiteChromePage;

  constructor(page: Page, path: string) {
    this.page = page;
    this.path = path;
    this.chrome = new SiteChromePage(page);
  }

  async goto(waitUntil: 'domcontentloaded' | 'commit' | 'load' = 'domcontentloaded'): Promise<void> {
    await this.page.goto(this.path, { waitUntil });
  }
}
