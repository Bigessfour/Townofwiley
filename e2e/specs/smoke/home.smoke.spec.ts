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
      'public records request destination',
    );
    await expect(homePage.page.locator('#records .transparency-action').first()).toHaveAttribute(
      'href',
      '/documents#records-requests',
    );
    await expect(homePage.page.locator('#records-guide-packets')).toContainText(
      'Find meeting packets and approved minutes',
    );
    await expect(
      homePage.page.locator('#records-guide-packets .records-guide-link'),
    ).toHaveAttribute('href', '/documents#meeting-documents');
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

  test('opens the public document hub from the records center', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.locator('#records-guide-packets .records-guide-link').click();

    await expect(homePage.page).toHaveURL(/\/documents#meeting-documents$/);
    await expect(homePage.page.locator('.document-hub-title')).toContainText(
      'Stable public destinations for meetings, finance records, and code references',
    );
    await expect(homePage.page.locator('#meeting-documents')).toContainText(
      'City Council packets and approved minutes',
    );
  });

  test('routes search results into public document destinations', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.locator('#site-search').fill('budget summaries');
    await homePage.page.locator('.search-submit').click();

    await expect(homePage.page).toHaveURL(/\/documents#financial-documents$/);
    await expect(homePage.page.locator('#financial-documents')).toContainText(
      'Budget summaries and annual reports',
    );
  });
});
