import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class DocumentsPage extends PublicRoutePage {
  readonly archive: Locator;

  constructor(page: Page) {
    super(page, '/documents');
    this.archive = page.getByTestId('meeting-documents-archive');
  }
}
