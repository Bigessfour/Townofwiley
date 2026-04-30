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

    await expect(meetingsPanel).toContainText('Meeting access and community updates');
    await expect(homePage.page.getByRole('link', { name: 'Open calendar' })).toHaveAttribute(
      'href',
      '/meetings#calendar',
    );
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
    await expect(homePage.meetingCards).toHaveCount(siteContent.homepageCounts.meetingCards);
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
