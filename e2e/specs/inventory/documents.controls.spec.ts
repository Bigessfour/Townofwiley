import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import type { DocumentsPage } from '../../pages/documents.page';
import { activateSkipToMainContent } from '../../support/homepage-nws-alert';
import { inventoryStep } from '../../support/inventory-step';
import { expectDocumentsHub } from '../../support/route-assertions';

async function waitForMeetingsArchive(documentsPage: DocumentsPage): Promise<void> {
  await expect(documentsPage.page).toHaveURL(/\/meetings$/);
  await expect(documentsPage.archive).toBeVisible({ timeout: 20_000 });
}

test.describe('documents redirect inventory controls', () => {
  test('[shared.skip-to-content] meetings skip link targets main content', async ({
    documentsPage,
  }) => {
    await documentsPage.goto();

    await inventoryStep('Activate meetings skip link', async () => {
      await activateSkipToMainContent(documentsPage.page);
    });

    await expect(documentsPage.page.locator('#main-content')).toBeVisible();
  });

  test('[documents.category-filter-search] archive search is visible after redirect', async ({
    documentsPage,
  }) => {
    await documentsPage.goto();
    await waitForMeetingsArchive(documentsPage);

    await inventoryStep('Filter meeting documents by keyword', async () => {
      await documentsPage.page
        .getByPlaceholder(/Search agendas, minutes, or keywords/i)
        .fill('Agenda');
    });

    await expectDocumentsHub(documentsPage.page);
  });
});
