import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('feature page coverage', () => {
  test.describe.configure({ timeout: 90000 });

  test('business directory search keeps verified contact actions available', async ({
    homePage,
  }) => {
    await homePage.page.goto('/businesses', { waitUntil: 'domcontentloaded' });

    await expect(homePage.businessDirectoryHeading).toHaveText(siteContent.cmsHeadings.businesses);

    await homePage.searchBusinessDirectory('Tempel Grain');

    const tempelGrainCard = homePage.businessDirectoryCards.filter({ hasText: 'Tempel Grain' });

    await expect(tempelGrainCard).toHaveCount(1);
    await expect(tempelGrainCard.getByRole('link', { name: 'Visit website' })).toHaveAttribute(
      'href',
      'https://www.tempelgrain.com/',
    );
    await expect(tempelGrainCard.getByRole('link', { name: 'Call' })).toHaveAttribute(
      'href',
      'tel:7198294408',
    );
  });

  test('meetings page keeps the calendar and meeting summary reachable', async ({ homePage }) => {
    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    const meetingsPanel = homePage.page.locator('[aria-labelledby="meetings-heading"]');

    await expect(meetingsPanel).toContainText('Council meetings & schedules');
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
    const meetingRows = homePage.page.locator('.meetings-table tbody tr');
    await expect(meetingRows).toHaveCount(siteContent.homepageCounts.meetingCards, {
      timeout: 20000,
    });
  });

  test('meetings table agenda affordance routes to document hub meeting section', async ({
    homePage,
  }) => {
    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    await expect(homePage.page.locator('.meetings-table tbody tr').first()).toBeVisible({
      timeout: 20000,
    });

    const meetingsTable = homePage.page.locator('.meetings-table');
    const agendaControl = meetingsTable.locator('p-button').filter({ hasText: /View agenda PDFs/i }).first();

    await expect(agendaControl).toBeVisible({ timeout: 20000 });
    await agendaControl.click();

    await expect(homePage.page).toHaveURL(/\/documents/);
    await expect(homePage.page).toHaveURL(/meeting-documents/);
  });

  test('calendar list exposes Google Calendar and ICS actions with stable targets', async ({
    homePage,
  }) => {
    await homePage.page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    const calendarRegion = homePage.page.locator('#calendar');

    const googleAction = calendarRegion
      .getByRole('link', { name: /Add to Google Calendar/i })
      .first();

    await expect(googleAction).toBeVisible({ timeout: 20000 });
    await expect(googleAction).toHaveAttribute('href', /calendar\.google\.com/);
    await expect(googleAction).toHaveAttribute('target', '_blank');

    const icsAction = calendarRegion.getByRole('link', { name: /Download ICS/i }).first();
    await expect(icsAction).toBeVisible();
    await expect(icsAction).toHaveAttribute('href', /^data:text\/calendar/);
  });

  test('documents page keeps the document hub and archive link visible', async ({ homePage }) => {
    await homePage.page.goto('/documents', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', { level: 1, name: siteContent.cmsHeadings.documentsHub }),
    ).toBeVisible();

    const meetingAccessGuide = homePage.page.locator('article', {
      hasText: 'City Council Meeting Access Guide',
    });

    await expect(meetingAccessGuide.getByRole('link', { name: 'Open document' })).toHaveAttribute(
      'href',
      '/documents/archive/city-council-meeting-access-guide.html',
    );
    await expect(meetingAccessGuide.getByRole('link', { name: 'Download file' })).toHaveAttribute(
      'href',
      '/documents/archive/city-council-meeting-access-guide.html',
    );
  });
});
