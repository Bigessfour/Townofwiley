import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class DocumentsPage extends PublicRoutePage {
  readonly title: Locator;
  readonly searchInput: Locator;
  readonly openDocumentLinks: Locator;

  constructor(page: Page) {
    super(page, '/documents');
    this.title = page.getByTestId('document-hub-title');
    this.searchInput = page.getByPlaceholder(/Search agendas, minutes, or keywords/i);
    this.openDocumentLinks = page.getByRole('link', { name: 'Open document' });
  }
}
