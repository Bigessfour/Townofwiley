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

  test('[home.feature-card-weather] compact weather opens the forecast page', async ({
    homePage,
  }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    await inventoryStep('Click homepage weather forecast link', async () => {
      await homePage.page
        .locator('#homepage-weather')
        .getByRole('link', { name: 'Local weather' })
        .click();
    });

    await expect(homePage.page).toHaveURL(/\/weather/);
    await expectWeatherPageHeading(homePage.page);
  });

  test('[home.feature-card-notices] view all news opens the news hub', async ({ homePage }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);

    await inventoryStep('Click view all news link', async () => {
      await homePage.page.getByRole('link', { name: 'View all news' }).click();
    });

    await expect(homePage.page).toHaveURL(/\/news/);
    await expectNoticesPageCards(homePage);
  });

  test('[home.notice-card-navigate] view-all-news link opens the news hub', async ({
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

    const viewAllNews = homePage.page.getByRole('link', { name: 'View all news' });
    await expect(viewAllNews).toBeVisible({ timeout: 25_000 });
    await viewAllNews.scrollIntoViewIfNeeded();

    await inventoryStep('Click view all news link', async () => {
      await viewAllNews.click();
    });

    await expect(homePage.page).toHaveURL(/\/news/);
  });

  test('[home.notice-card-link] homepage notice card navigates to newsletter on /news', async ({
    homePage,
  }) => {
    await homePage.goto();
    await revealHomepageDeferredBlocks(homePage);
    await homePage.page.locator('#homepage-notices-heading').scrollIntoViewIfNeeded();

    const noticeCard = homePage.page.locator('.landing-notice-timeline a.notice-card--link').first();
    await expect(noticeCard).toBeVisible({ timeout: 25_000 });

    await inventoryStep('Click homepage notice card', async () => {
      await noticeCard.click();
    });

    await expect(homePage.page).toHaveURL(/\/news/);
    await expect(
      homePage.page.getByRole('heading', { name: /Newsletter from Town Hall/i }),
    ).toBeVisible();
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
