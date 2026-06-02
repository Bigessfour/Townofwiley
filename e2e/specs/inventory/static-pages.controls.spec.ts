import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';
import { expectPrivacyPage, expectTermsPage } from '../../support/route-assertions';

test.describe('static legal pages inventory controls', () => {
  test('[accessibility.barrier-report-action] accessibility report action is visible', async ({
    accessibilityPage,
  }) => {
    await accessibilityPage.goto();

    await inventoryStep('Verify barrier report action', async () => {
      await expect(accessibilityPage.reportAction).toBeVisible();
    });
  });

  test('[privacy.sms-terms-anchor] privacy page links to SMS terms', async ({ privacyPage }) => {
    await privacyPage.goto();
    await expectPrivacyPage(privacyPage.page);

    await inventoryStep('Follow SMS terms link', async () => {
      await privacyPage.smsTermsLink.click();
    });

    await expect(privacyPage.page).toHaveURL(/\/terms/);
  });

  test('[terms.privacy-anchor-link] terms page links back to privacy notice', async ({
    termsPage,
  }) => {
    await termsPage.goto();
    await expectTermsPage(termsPage.page);

    await inventoryStep('Follow privacy notice link', async () => {
      await termsPage.privacyLink.click();
    });

    await expect(termsPage.page).toHaveURL(/\/privacy/);
  });
});
