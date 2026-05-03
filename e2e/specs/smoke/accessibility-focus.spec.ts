import type { Locator } from '@playwright/test';
import { expect, test } from '../../fixtures/town.fixture';
import { mockWeatherProxyRoute } from '../../support/weather-mocks';

async function expectVisibleKeyboardFocus(locator: Locator): Promise<void> {
  await expect(locator).toBeFocused();

  const focusStyle = await locator.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      boxShadow: style.boxShadow,
    };
  });

  expect(
    focusStyle.outlineStyle !== 'none' ||
      focusStyle.outlineWidth > 0 ||
      focusStyle.boxShadow !== 'none',
  ).toBe(true);
}

test.describe('accessibility and focus behavior', () => {
  test('skip link moves focus to main content', async ({ homePage }) => {
    await homePage.goto();

    await homePage.skipLink.focus();
    await expect(homePage.skipLink).toBeFocused();

    await homePage.page.keyboard.press('Enter');

    await expect(homePage.page).toHaveURL(/#main-content$/);
    await expect(homePage.mainContent).toBeFocused();
  });

  test('accessibility report form keeps keyboard order and visible focus states', async ({
    homePage,
  }) => {
    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });

    await homePage.fillAccessibilityBarrierReport({
      name: 'Jordan Resident',
      contact: 'jordan@example.com',
      page: 'Resident Services > Issue reporting',
      details: 'The form needs to show a keyboard focus ring on every required field.',
    });

    await homePage.accessibilityReportName.focus();
    await expectVisibleKeyboardFocus(homePage.accessibilityReportName);

    await homePage.page.keyboard.press('Tab');
    await expectVisibleKeyboardFocus(homePage.accessibilityReportContact);

    await homePage.page.keyboard.press('Tab');
    await expectVisibleKeyboardFocus(homePage.accessibilityReportPage);

    await homePage.page.keyboard.press('Tab');
    await expectVisibleKeyboardFocus(homePage.accessibilityReportDetails);

    await homePage.page.keyboard.press('Shift+Tab');
    await expectVisibleKeyboardFocus(homePage.accessibilityReportPage);
  });

  test('accessibility report form exposes a readable screen-reader structure', async ({
    homePage,
  }) => {
    await homePage.page.goto('/accessibility', { waitUntil: 'domcontentloaded' });

    await expect(homePage.accessibilityReportCard.locator('form')).toMatchAriaSnapshot(`
      - text: Your name
      - textbox "Your name"
      - text: Best phone or email for follow-up
      - textbox "Best phone or email for follow-up"
      - text: Page, document, or service with the barrier
      - textbox "Page, document, or service with the barrier"
      - text: Describe the barrier
      - textbox "Describe the barrier"
      - text: Open accessibility report email
    `);
  });

  test('accessibility report fields stay labelled and submission is mailto-based', async ({
    homePage,
  }) => {
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

  test('keyboard activates language, task picker, and alert signup controls', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'Desktop covers hardware-keyboard activation for these controls.',
    );

    await homePage.goto();

    const nav = homePage.page.getByTestId('homepage-section-nav');
    const spanishButton = nav.locator('#site-language-es');
    await spanishButton.focus();
    await expect(spanishButton).toBeFocused();
    await homePage.page.keyboard.press('Enter');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', 'es');

    const englishButton = nav.locator('#site-language-en');
    await englishButton.focus();
    await expect(englishButton).toBeFocused();
    await homePage.page.keyboard.press('Space');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', 'en');

    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await homePage.residentServiceIssueToggle.focus();
    await expect(homePage.residentServiceIssueToggle).toBeFocused();
    await homePage.page.keyboard.press('Enter');
    await expect(homePage.residentServiceIssueToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.residentServiceIssuePanel).toBeVisible();

    await homePage.residentServiceRecordsToggle.focus();
    await expect(homePage.residentServiceRecordsToggle).toBeFocused();
    await homePage.page.keyboard.press('Space');
    await expect(homePage.residentServiceRecordsToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.residentServiceRecordsPanel).toBeVisible();

    await homePage.enableWeatherProxy();
    await homePage.enableAlertSignup('/mock-alert-signup');
    await mockWeatherProxyRoute(homePage.page, '/mock-weather');
    await homePage.page.goto('/weather', { waitUntil: 'domcontentloaded' });

    await homePage.weatherSignupDestination.focus();
    await expect(homePage.weatherSignupDestination).toBeFocused();
    await homePage.weatherSignupDestination.fill('17198294974');
    await homePage.weatherSignupSubmitButton.focus();
    await expect(homePage.weatherSignupSubmitButton).toBeFocused();
  });
});
