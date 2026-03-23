import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage smoke', () => {
  test('renders the Wiley landing page scaffold', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page).toHaveTitle(siteContent.documentTitle);
    await expect(homePage.heroHeading).toContainText(siteContent.heading);
    await expect(homePage.weatherPanel).toBeVisible();
    await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
    await expect(homePage.communityFacts).toHaveCount(3);
    await expect(homePage.topTaskCards).toHaveCount(4);
    await expect(homePage.noticeCards).toHaveCount(3);
    await expect(homePage.serviceCards).toHaveCount(6);
    await expect(homePage.contactCards).toHaveCount(4);
    await expect(homePage.page.locator('#records .transparency-action')).toHaveCount(3);
    await expect(homePage.page.locator('#records .records-guide-card')).toHaveCount(4);
    await expect(homePage.page.locator('#resident-services .resident-service-card')).toHaveCount(3);
    await expect(homePage.page.locator('#records .transparency-action').first()).toContainText(
      'records or FOIA request',
    );
    await expect(homePage.page.locator('#records-guide-packets')).toContainText(
      'Meeting packets and approved minutes',
    );
    await expect(homePage.page.locator('.calendar-overview')).toContainText(
      'Seeded schedule fallback',
    );
    await expect(homePage.page.locator('#payment-help')).toContainText('Pay utility bill');
    await expect(homePage.page.locator('#issue-report')).toContainText(
      'Report a street or utility issue',
    );
    await expect(homePage.page.locator('#records-request')).toContainText(
      'Request records, permits, or clerk help',
    );
    await expect(homePage.accessibilitySection).toContainText('Accessibility Statement');
    await expect(homePage.accessibilitySection).toContainText('Report an accessibility barrier');
    await expect(homePage.page.locator('#barrier-report')).toContainText(
      'Open accessibility report email',
    );
  });

  test('surfaces the expected resident-first tasks', async ({ homePage }) => {
    await homePage.goto();

    for (const label of siteContent.topTaskHeadings) {
      await expect(homePage.topTaskCards.filter({ hasText: label })).toHaveCount(1);
    }
  });
});
