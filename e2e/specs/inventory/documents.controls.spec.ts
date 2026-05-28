import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { activateSkipToMainContent } from '../../support/homepage-nws-alert';
import { inventoryStep } from '../../support/inventory-step';
import { expectDocumentsHub } from '../../support/route-assertions';

test.describe('documents page inventory controls', () => {
  test('[shared.skip-to-content] document hub skip link targets main content', async ({
    documentsPage,
  }) => {
    await documentsPage.goto();

    await inventoryStep('Activate document hub skip link', async () => {
      await activateSkipToMainContent(documentsPage.page);
    });

    await expect(documentsPage.page.locator('#main-content')).toBeVisible();
  });

  test('[documents.category-filter-search] document search filters visible results', async ({
    documentsPage,
  }) => {
    await documentsPage.goto();

    await inventoryStep('Filter documents by keyword', async () => {
      await documentsPage.searchInput.fill('Agenda');
    });

    await expect(documentsPage.page.locator('.document-file-title').first()).toBeVisible();
    await expectDocumentsHub(documentsPage.page);
  });

  test('[documents.open-document-download] open document action is available', async ({
    documentsPage,
  }) => {
    await documentsPage.goto();

    await inventoryStep('Verify open document link', async () => {
      await expect(documentsPage.openDocumentLinks.first()).toBeVisible();
    });
  });

  test('[documents.archive-in-app-anchor] records requests anchor scrolls in-page', async ({
    documentsPage,
  }) => {
    await documentsPage.goto();

    await inventoryStep('Follow in-app records requests anchor', async () => {
      await documentsPage.page
        .getByRole('link', { name: 'Public records and FOIA requests' })
        .click();
    });

    await expect(documentsPage.page.locator('#records-requests')).toBeVisible();
    await expect(documentsPage.page).toHaveURL(/\/documents#records-requests/);
  });
});
