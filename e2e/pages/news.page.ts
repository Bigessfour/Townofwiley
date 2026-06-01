import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class NewsPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly readArticleLinks: Locator;

  constructor(page: Page) {
    super(page, '/news');
    this.heading = page.getByRole('heading', { level: 1, name: 'Town News and Announcements' });
    this.readArticleLinks = page.getByRole('link', { name: 'Read article' });
  }
}
