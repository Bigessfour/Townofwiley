import { expect, test } from '../../fixtures/town.fixture';
import { siteContent } from '../../support/site-content';

test.describe('homepage smoke', () => {
  test('renders the Wiley landing page scaffold', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page).toHaveTitle(siteContent.documentTitle);
    await expect(homePage.heroHeading).toContainText(siteContent.heading);
    await expect(homePage.communityFacts).toHaveCount(3);
    await expect(homePage.featureCards).toHaveCount(6);
    await expect(homePage.topTaskCards).toHaveCount(4);
    await expect(homePage.page.locator('.feature-card[href="/weather"]')).toContainText(
      'Local weather',
    );
    await expect(homePage.page.locator('.feature-card[href="/records"]')).toContainText(
      'Records and documents',
    );
    await expect(homePage.page.locator('#accessibility')).toHaveCount(0);
  });

  test('keeps the hero quick actions wired to resident tasks', async ({ homePage }) => {
    await homePage.goto();

    const heroActions = homePage.page.locator('.hero-actions .button-cta');
    const heroActionGroup = homePage.page.locator('.hero-actions');

    await expect(heroActions).toHaveCount(3);
    await expect(
      heroActionGroup.getByRole('link', {
        name: siteContent.heroActionLabels.topTasks,
        exact: true,
      }),
    ).toHaveAttribute('href', '#top-tasks');
    await expect(
      heroActionGroup.getByRole('link', {
        name: siteContent.heroActionLabels.calendar,
        exact: true,
      }),
    ).toHaveAttribute('href', '/meetings');

    await heroActionGroup
      .getByRole('button', { name: siteContent.heroActionLabels.alerts, exact: true })
      .click();

    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.weatherSignupShell).toBeVisible();
  });

  test('opens the remaining public feature pages from the homepage', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.locator('.feature-card[href="/notices"]').click();
    await expect(homePage.page).toHaveURL(/\/notices$/);
    await expect(homePage.noticeCards).toHaveCount(3);

    await homePage.goto();

    await homePage.page.locator('.feature-card[href="/meetings"]').click();
    await expect(homePage.page).toHaveURL(/\/meetings$/);
    await expect(homePage.meetingCards).toHaveCount(3);
    await expect(homePage.page.locator('.calendar-card')).toHaveCount(3);

    await homePage.goto();

    await homePage.page.locator('.feature-card[href="/services"]').click();
    await expect(homePage.page).toHaveURL(/\/services$/);
    await expect(homePage.serviceCards).toHaveCount(siteContent.serviceLabels.length);
    await expect(homePage.page.locator('#resident-services')).toBeVisible();

    await homePage.goto();

    await homePage.page.locator('.feature-card[href="/contact"]').click();
    await expect(homePage.page).toHaveURL(/\/contact$/);
    await expect(homePage.contactCards.first()).toBeVisible();
    await expect(homePage.page.locator('#contact')).toContainText('Deb Dillon');
    await expect(homePage.page.locator('.leadership-card')).toHaveCount(2);
  });

  test('surfaces the expected resident-first tasks', async ({ homePage }) => {
    await homePage.goto();

    for (const label of siteContent.topTaskHeadings) {
      await expect(homePage.topTaskCards.filter({ hasText: label })).toHaveCount(1);
    }
  });

  test('opens the local weather feature page from the homepage', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.locator('.feature-card[href="/weather"]').click();

    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
    await expect(homePage.weatherSignupShell).toBeVisible();
  });

  test('opens the public document hub from the records feature page', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.locator('.feature-card[href="/records"]').click();
    await homePage.page.locator('#records-guide-packets .records-guide-link').click();

    await expect(homePage.page).toHaveURL(/\/documents#meeting-documents$/);
    await expect(homePage.page.locator('.document-hub-title')).toContainText(
      'Stable public destinations for meetings, finance records, and code references',
    );

    await homePage.page
      .locator('a[href="/documents/archive/city-council-meeting-access-guide.html"]')
      .first()
      .click();

    await expect(homePage.page).toHaveURL(
      /\/documents\/archive\/city-council-meeting-access-guide\.html$/,
    );
    await expect(homePage.page.getByRole('heading', { level: 1 })).toContainText(
      'City Council Meeting Access Guide',
    );
  });

  test('opens the accessibility detail page from the footer', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.getByRole('link', { name: 'Accessibility statement' }).click();

    await expect(homePage.page).toHaveURL(/\/accessibility$/);
    await expect(homePage.page.locator('#barrier-report')).toContainText(
      'Open accessibility report email',
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
