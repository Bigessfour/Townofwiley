import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';
import { siteContent } from '../../support/site-content';

test.describe('services page inventory controls', () => {
  test('[services.payment-panel-toggle] payment help panel toggles on', async ({
    homePage,
    servicesPage,
  }) => {
    await servicesPage.goto();

    await inventoryStep('Select payment resident service panel', async () => {
      await homePage.selectResidentServicePanel('payment');
    });

    await expect(servicesPage.paymentPanel).toBeVisible();
  });

  test('[services.issue-report-panel] issue report panel toggles on', async ({
    homePage,
    servicesPage,
  }) => {
    await servicesPage.goto();

    await inventoryStep('Select issue report panel', async () => {
      await homePage.selectResidentServicePanel('issue');
    });

    await expect(homePage.residentServiceIssuePanel).toBeVisible();
  });
});

test.describe('records redirect inventory controls', () => {
  test('[records.redirect-contact-assistance] /records redirects to clerk assistance', async ({
    recordsPage,
  }) => {
    await recordsPage.goto();

    await inventoryStep('Verify /records redirect shows clerk assistance', async () => {
      await expect(recordsPage.page).toHaveURL(/\/contact$/);
      await expect(recordsPage.recordsAssistance).toBeVisible();
    });
  });
});

test.describe('businesses page inventory controls', () => {
  test('[businesses.directory-search] business directory search filters cards', async ({
    homePage,
    businessesPage,
  }) => {
    await businessesPage.goto();

    await inventoryStep('Search business directory', async () => {
      await homePage.searchBusinessDirectory('Tempel Grain');
    });

    await expect(businessesPage.directoryCards.filter({ hasText: 'Tempel Grain' })).toHaveCount(1);
  });
});

test.describe('permits page inventory controls', () => {
  test('[permits.heading-visible] permits heading is visible', async ({ permitsPage }) => {
    await permitsPage.goto();

    await inventoryStep('Verify permits heading', async () => {
      await expect(permitsPage.heading).toBeVisible();
    });
  });
});

test.describe('news page inventory controls', () => {
  test('[news.read-article-link] read article links are available', async ({ newsPage }) => {
    await newsPage.goto();

    await inventoryStep('Verify read article links', async () => {
      await expect(newsPage.readArticleLinks.first()).toBeAttached();
    });
  });
});

test.describe('notices page inventory controls', () => {
  test('[notices.cards-visible] notice cards render on notices page', async ({ noticesPage }) => {
    await noticesPage.goto();

    await inventoryStep('Verify notice cards', async () => {
      await expect(noticesPage.noticeCards.first()).toBeVisible({ timeout: 20_000 });
      await expect(noticesPage.noticeCards).toHaveCount(siteContent.homepageCounts.noticeCards, {
        timeout: 20_000,
      });
    });
  });
});
