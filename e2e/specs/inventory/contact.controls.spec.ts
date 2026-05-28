import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';
import { expectContactPage } from '../../support/route-assertions';

test.describe('contact page inventory controls', () => {
  test('[contact.mailto-link] contact mailto links are prepared for residents', async ({
    contactPage,
  }) => {
    await contactPage.goto();
    await expectContactPage(contactPage.page);

    await inventoryStep('Verify mailto contact link', async () => {
      await expect(contactPage.mailtoLinks.first()).toHaveAttribute('href', /^mailto:/);
    });
  });
});
