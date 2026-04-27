import { expect, test } from '../../fixtures/town.fixture';

test.describe('accessibility and focus behavior', () => {
  test('skip link moves focus to main content', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.keyboard.press('Tab');

    await expect(homePage.skipLink).toBeFocused();

    await homePage.page.keyboard.press('Enter');

    await expect(homePage.page).toHaveURL(/#main-content$/);
    await expect(homePage.mainContent).toBeFocused();
  });

  test('accessibility report fields stay labelled and submission is mailto-based', async ({ homePage }) => {
    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });

    await expect(homePage.accessibilityReportCard).toBeVisible();
    await homePage.fillAccessibilityBarrierReport({
      name: 'Jordan Resident',
      contact: 'jordan@example.com',
      page: 'Resident Services > Issue reporting',
      details: 'The issue report controls are not reachable with keyboard navigation.',
    });
    await expect(homePage.accessibilityReportName).toBeVisible();
    await expect(homePage.accessibilityReportContact).toBeVisible();
    await expect(homePage.accessibilityReportPage).toBeVisible();
    await expect(homePage.accessibilityReportDetails).toBeVisible();
    await expect(homePage.accessibilityReportCard).toContainText('Open accessibility report email');
    await expect(
      homePage.page.getByRole('link', { name: 'Email the Clerk · deb.dillon@townofwiley.gov' }),
    ).toHaveAttribute('href', 'mailto:deb.dillon@townofwiley.gov');
  });
});
