import { expect, test } from '../../fixtures/town.fixture';

test.describe('homepage high-value interactions', () => {
  test('opens /pay-bill from the services pay bill card', async ({ homePage }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await expect(homePage.residentServicePaymentToggle).toHaveAttribute('href', /\/pay-bill$/);
    await homePage.selectResidentServicePanel('payment');

    await expect(homePage.page).toHaveURL(/\/pay-bill$/);
    await expect(homePage.page.locator('#payment-help')).toHaveCount(0);
  });

  test('opens the weather page from the services weather card', async ({ homePage }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await expect(homePage.residentServiceWeatherToggle).toHaveAttribute('href', '/weather');
    await homePage.selectResidentServicePanel('weather');

    await expect(homePage.page).toHaveURL(/\/weather$/);
  });

  test('switches resident services to issue reporting and prepares the email request', async ({
    homePage,
  }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await homePage.selectResidentServicePanel('issue');

    await expect(homePage.page).toHaveURL(/#issue-report/);
    await expect(homePage.residentServiceIssuePanel).toBeVisible();
    await expect(homePage.residentServiceIssueToggle).toHaveAttribute('aria-current', 'page');

    await homePage.fillResidentIssueReport({
      name: 'Jordan Resident',
      location: '210 Main Street',
      contact: 'jordan@example.com',
      details: 'A streetlight is out near the corner and should be checked.',
    });

    await expect(homePage.residentServiceIssueActionButton).toContainText('Send report');
    await expect(
      homePage.page.getByRole('link', { name: /Email contact · clerk@townofwiley\.gov/i }),
    ).toHaveAttribute('href', 'mailto:clerk@townofwiley.gov');
  });

  test('prepares the accessibility barrier report email from the public accessibility page', async ({
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

    await expect(homePage.accessibilityReportAction).toContainText(
      'Open accessibility report email',
    );
    await expect(
      homePage.page.getByRole('link', { name: 'Email the Clerk · clerk@townofwiley.gov' }),
    ).toHaveAttribute('href', 'mailto:clerk@townofwiley.gov');
  });

  test('keeps the business directory search and contact actions usable', async ({ homePage }) => {
    await homePage.page.goto('/businesses', { waitUntil: 'domcontentloaded' });

    await expect(homePage.businessDirectoryHeading).toBeVisible();

    await homePage.searchBusinessDirectory('Tempel Grain');

    await expect(homePage.businessDirectoryCards).toHaveCount(1);

    const tempelGrainCard = homePage.businessDirectoryCards.filter({ hasText: 'Tempel Grain' });

    await expect(tempelGrainCard.getByRole('link', { name: 'Visit website' })).toHaveAttribute(
      'href',
      'https://www.tempelgrain.com/',
    );
    await expect(tempelGrainCard.getByRole('link', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:7198294408',
    );
    await expect(tempelGrainCard.getByRole('link', { name: /100 Main Street/ })).toHaveAttribute(
      'href',
      /google\.com\/maps\/search\/\?api=1&query=/,
    );
  });
});
