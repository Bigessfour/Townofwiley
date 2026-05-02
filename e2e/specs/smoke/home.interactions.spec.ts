import { expect, test } from '../../fixtures/town.fixture';

test.describe('homepage high-value interactions', () => {
  test('switches resident services to payment support and exposes the Paystar portal', async ({
    homePage,
  }) => {
    await homePage.enablePaystarPortal();
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await homePage.selectResidentServicePanel('payment');

    await expect(homePage.residentServicePaymentPanel).toBeVisible();
    await expect(homePage.residentServicePaymentToggle).toHaveAttribute('aria-pressed', 'true');

    await homePage.fillResidentPaymentRequest({
      fullName: 'Jordan Resident',
      serviceAddress: '210 Main Street',
      phone: '(719) 829-4974',
      email: 'jordan@example.com',
      notes: 'I need to review my current utility balance before paying.',
    });

    await expect(homePage.residentServicePaymentPortalAction).toHaveAttribute(
      'href',
      'https://secure.paystar.io/townofwiley',
    );

    await expect(homePage.residentServicePaymentSubmit).toBeVisible();
  });

  test('switches resident services to records requests and prepares the email request', async ({
    homePage,
  }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await homePage.selectResidentServicePanel('records');

    await expect(homePage.residentServiceRecordsPanel).toBeVisible();
    await expect(homePage.residentServiceRecordsToggle).toHaveAttribute('aria-pressed', 'true');

    await homePage.fillResidentRecordsRequest({
      name: 'Jordan Resident',
      contact: 'jordan@example.com',
      deadline: 'Friday afternoon',
      details: 'Please send the most recent meeting packet and approved minutes for review.',
    });

    await expect(homePage.residentServiceRecordsAction).toContainText('Send request');
    await expect(
      homePage.page.getByRole('link', { name: /Email contact · deb\.dillon@townofwiley\.gov/i }),
    ).toHaveAttribute('href', 'mailto:deb.dillon@townofwiley.gov');
  });

  test('switches resident services to issue reporting and prepares the email request', async ({
    homePage,
  }) => {
    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });

    await homePage.selectResidentServicePanel('issue');

    await expect(homePage.residentServiceIssuePanel).toBeVisible();
    await expect(homePage.residentServiceIssueToggle).toHaveAttribute('aria-pressed', 'true');

    await homePage.fillResidentIssueReport({
      name: 'Jordan Resident',
      location: '210 Main Street',
      contact: 'jordan@example.com',
      details: 'A streetlight is out near the corner and should be checked.',
    });

    await expect(homePage.residentServiceIssueActionButton).toContainText('Send report');
    await expect(
      homePage.page.getByRole('link', { name: /Email contact · scott\.whitman@townofwiley\.gov/i }),
    ).toHaveAttribute('href', 'mailto:scott.whitman@townofwiley.gov');
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
      homePage.page.getByRole('link', { name: 'Email the Clerk · deb.dillon@townofwiley.gov' }),
    ).toHaveAttribute('href', 'mailto:deb.dillon@townofwiley.gov');
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

  test('closes the Ask Wiley dialog with Escape and returns focus to the launcher', async ({
    homePage,
  }) => {
    await homePage.enableProgrammaticChat();
    await homePage.goto();

    await homePage.openAssistantDialog();
    await expect(homePage.assistantInput).toBeVisible();

    await homePage.assistantInput.click();
    await expect(homePage.assistantInput).toBeFocused();

    await homePage.page.keyboard.press('Escape');

    await expect(homePage.assistantDialog).toBeHidden();
  });
});
