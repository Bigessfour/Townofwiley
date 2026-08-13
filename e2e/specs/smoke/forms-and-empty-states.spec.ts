import { expect, test } from '../../fixtures/town.fixture';
import { mockWeatherProxyRoute } from '../../support/weather-mocks';

test.describe('forms and empty states', () => {
  test('shows issue-report validation before preparing outbound email actions', async ({
    homePage,
  }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await homePage.selectResidentServicePanel('issue');
    await homePage.residentServiceIssueActionButton.click();
    await expect(
      homePage.page.getByText('Please review the highlighted fields.').first(),
    ).toBeVisible();
    await expect(homePage.residentServiceIssuePanel).toContainText(
      'Location: This field is required.',
    );
  });

  test('keeps accessibility report validation visible until required details are complete', async ({
    homePage,
  }) => {
    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('#barrier-report')).toBeVisible({ timeout: 20_000 });
    await homePage.accessibilityReportAction.click();

    await expect(homePage.accessibilityReportStatus).toContainText(
      'Complete the contact, page, and barrier details',
    );
    await expect(homePage.accessibilityReportContact).toBeVisible();
    await expect(homePage.accessibilityReportPage).toBeVisible();
    await expect(homePage.accessibilityReportDetails).toBeVisible();
  });

  test('shows empty search states for site search and business directory filtering', async ({
    homePage,
  }) => {
    await homePage.goto();

    await homePage.searchFor('zzzzxyzzy no wiley match');
    await expect(homePage.searchResults).toHaveCount(0);
    await expect(homePage.emptySearchState).toContainText('No direct match yet');

    await homePage.page.goto('/businesses', { waitUntil: 'domcontentloaded' });
    await expect(homePage.businessDirectoryCards.first()).toBeVisible({ timeout: 20_000 });
    await homePage.searchBusinessDirectory('zzzzxyzzy-nomatch-9f3k');

    await expect(homePage.page.getByText(/No businesses match your search/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(homePage.businessDirectoryCards).toHaveCount(0);
    await expect(homePage.businessDirectoryEmptyState).toBeVisible();
  });

  test('surfaces weather service and alert signup failures in the browser', async ({
    homePage,
  }) => {
    await homePage.enableWeatherProxy('/mock-weather-down');
    await homePage.enableAlertSignup('/mock-alert-signup');

    await homePage.page.route('**/mock-weather-down', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'weather proxy unavailable' }),
      });
    });

    await homePage.page.goto('/weather', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('.weather-status.is-error')).toContainText(
      'temporarily unavailable',
    );

    await homePage.enableWeatherProxy('/mock-weather-ok');
    await mockWeatherProxyRoute(homePage.page, '/mock-weather-ok');
    await homePage.page.route('**/mock-alert-signup/subscriptions', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Signup service unavailable' }),
      });
    });

    await homePage.page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await homePage.chooseWeatherSignupChannel('email');
    await homePage.submitWeatherAlertSignup('resident@example.com', 'Jordan Resident');

    await expect(homePage.weatherSignupStatus).toContainText('Signup service unavailable');
  });
});
