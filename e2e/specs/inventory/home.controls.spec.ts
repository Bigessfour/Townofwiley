import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { mockCmsSnapshotWithExtraNotices } from '../../support/cms-extra-notices';
import { revealHomepageDeferredBlocks } from '../../support/homepage-defer';
import { primeHomepageNwsAlert } from '../../support/homepage-nws-alert';
import { inventoryStep } from '../../support/inventory-step';
import { siteContent } from '../../support/site-content';
import {
  expectMeetingsCalendar,
  expectNoticesPageCards,
  expectPayBillPage,
  expectServiceIssueReport,
  expectServicesPage,
  expectWeatherPageHeading,
} from '../../support/route-assertions';

test.describe.configure({ mode: 'parallel', timeout: 120_000 });

test.describe('homepage inventory controls', () => {
  test('[home.quick-tasks-pay-bill] Quick Task pay bill card navigates', async ({ homePage }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    const payBillTask = homePage.page.locator('.landing-task-grid a.task-card[href="/pay-bill"]');
    await expect(payBillTask).toBeVisible({ timeout: 25_000 });

    await inventoryStep('Click pay utility bill task card', async () => {
      await payBillTask.click();
    });

    await expect(homePage.page).toHaveURL(/\/pay-bill/);
    await expectPayBillPage(homePage.page);
  });

  test('[home.quick-tasks-meetings] Quick Task meetings card navigates', async ({ homePage }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    const meetingsTask = homePage.page.locator('.landing-task-grid a.task-card[href="/meetings"]');
    await expect(meetingsTask).toBeVisible({ timeout: 25_000 });

    await inventoryStep('Click meetings task card', async () => {
      await meetingsTask.click();
    });

    await expect(homePage.page).toHaveURL(/\/meetings/);
    await expectMeetingsCalendar(homePage.page);
  });

  test('[home.hero-explore-services] hero CTA navigates to services', async ({ homePage }) => {
    await homePage.goto();

    const heroCta = homePage.page.getByRole('link', {
      name: /Explore resident services/i,
    });
    await inventoryStep('Click hero explore services CTA', async () => {
      await heroCta.click();
    });

    await expect(homePage.page).toHaveURL(/\/services/);
    await expectServicesPage(homePage);
  });

  test('[home.feature-card-weather] feature card navigates to weather', async ({ homePage }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    await inventoryStep('Click weather feature card', async () => {
      await homePage.page.locator('.feature-grid .feature-card[href="/weather"]').click();
    });

    await expect(homePage.page).toHaveURL(/\/weather/);
    await expectWeatherPageHeading(homePage.page);
  });

  test('[home.feature-card-notices] feature card navigates to notices', async ({ homePage }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    await inventoryStep('Click notices feature card', async () => {
      await homePage.page.locator('.feature-grid .feature-card[href="/notices"]').click();
    });

    await expect(homePage.page).toHaveURL(/\/notices/);
    await expectNoticesPageCards(homePage);
  });

  test('[home.notice-card-navigate] view-all-notices link opens notices page', async ({
    homePage,
  }) => {
    await mockCmsSnapshotWithExtraNotices(homePage.page);
    const snapshotLoaded = homePage.page.waitForResponse(
      (response) => response.url().includes('cms-snapshot.json') && response.ok(),
    );
    await homePage.goto();
    await snapshotLoaded;
    await revealHomepageDeferredBlocks(homePage);
    await homePage.page.locator('#homepage-notices-heading').scrollIntoViewIfNeeded();

    const viewAllNotices = homePage.page.getByRole('link', { name: 'View all notices' });
    await expect(viewAllNotices).toBeVisible({ timeout: 25_000 });
    await viewAllNotices.scrollIntoViewIfNeeded();

    await inventoryStep('Click view all notices link', async () => {
      await viewAllNotices.click();
    });

    await expect(homePage.page).toHaveURL(/\/notices/);
  });

  test('[home.meeting-card-navigate] open calendar link opens meetings page', async ({
    homePage,
  }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    await inventoryStep('Click open full town calendar link', async () => {
      await homePage.page
        .getByRole('link', { name: siteContent.heroActionLabels.calendar, exact: true })
        .click();
    });

    await expect(homePage.page).toHaveURL(/\/meetings/);
    await expectMeetingsCalendar(homePage.page);
  });

  test('[home.weather-signup-teaser] site alert signup navigates to weather signup', async ({
    homePage,
  }) => {
    await homePage.enableAlertSignup('/mock-alert-signup');
    await primeHomepageNwsAlert(homePage);
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    const signupCta = homePage.page.getByTestId('nws-banner-signup');
    await expect(signupCta).toBeVisible({ timeout: 20_000 });

    await inventoryStep('Click weather signup teaser from site alert', async () => {
      await signupCta.locator('button').click();
    });

    await expect(homePage.page).toHaveURL(/\/weather#weather-alert-signup/, { timeout: 20_000 });
  });

  test('[home.site-alert-cta] NWS forecast action is reachable from alert banner', async ({
    homePage,
  }) => {
    await primeHomepageNwsAlert(homePage);
    await homePage.goto();

    await inventoryStep('Verify NWS forecast action from site alert', async () => {
      await expect(homePage.page.getByTestId('nws-banner-forecast')).toBeVisible({
        timeout: 20_000,
      });
    });
  });
});
