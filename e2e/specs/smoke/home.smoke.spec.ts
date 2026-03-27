import { expect, test } from '../../fixtures/town.fixture';
import type { HomePage } from '../../pages/home.page';
import { siteContent } from '../../support/site-content';

interface NavigationGateway {
  name: string;
  click: (homePage: HomePage) => Promise<void>;
  expectedUrl: RegExp;
  assertDestination: (homePage: HomePage) => Promise<void>;
}

interface FeaturePageGateway {
  name: string;
  linkName: RegExp;
  expectedUrl: RegExp;
  assertDestination: (homePage: HomePage) => Promise<void>;
}

async function expectGatewayFromHomepage(
  homePage: HomePage,
  gateway: NavigationGateway,
): Promise<void> {
  await homePage.goto();
  await gateway.click(homePage);
  await expect(homePage.page, gateway.name).toHaveURL(gateway.expectedUrl);
  await gateway.assertDestination(homePage);
}

async function expectWeatherPage(homePage: HomePage): Promise<void> {
  await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
}

async function expectNoticesPage(homePage: HomePage): Promise<void> {
  await expect(homePage.noticeCards).toHaveCount(3);
}

async function expectMeetingsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.meetingCards).toHaveCount(3);
}

async function expectMeetingsCalendar(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#calendar')).toBeVisible();
}

async function expectServicesPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#resident-services')).toBeVisible();
}

async function expectRecordsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#records-guide-packets .records-guide-link')).toBeVisible();
}

async function expectDocumentsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('.document-hub-title')).toContainText(
    'Stable public destinations for meetings, finance records, and code references',
  );
}

async function expectAccessibilityPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#barrier-report')).toContainText(
    'Open accessibility report email',
  );
}

async function expectBusinessesPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#business-directory-heading')).toContainText(
    siteContent.cmsHeadings.businesses,
  );
}

async function expectNewsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('.news-page-shell h1')).toContainText(
    siteContent.cmsHeadings.news,
  );
}

async function expectContactPage(homePage: HomePage): Promise<void> {
  await expect(homePage.contactCards.first()).toBeVisible();
}

async function expectTopTasksAnchor(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#top-tasks')).toBeVisible();
}

async function expectServicePaymentHelp(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#payment-help')).toBeVisible();
}

async function expectServiceIssueReport(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#issue-report')).toBeVisible();
}

async function expectServiceRecordsRequest(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#records-request')).toBeVisible();
}

async function expectFeaturePageFromHomepage(
  homePage: HomePage,
  gateway: FeaturePageGateway,
): Promise<void> {
  await homePage.goto();

  const featureGrid = homePage.page.getByRole('region', { name: 'Town feature pages' });
  const featureCard = featureGrid.getByRole('link', { name: gateway.linkName });

  await expect(featureCard, gateway.name).toBeVisible();
  await featureCard.scrollIntoViewIfNeeded();
  await featureCard.click();

  await expect(homePage.page, gateway.name).toHaveURL(gateway.expectedUrl);
  await gateway.assertDestination(homePage);
}

const sectionNavigationGateways: NavigationGateway[] = [
  {
    name: 'Top Tasks section nav',
    click: (page) => page.page.locator('.section-nav a[href="/#top-tasks"]').click(),
    expectedUrl: /\/#top-tasks$/,
    assertDestination: expectTopTasksAnchor,
  },
  {
    name: 'Weather section nav',
    click: (page) => page.page.locator('.section-nav a[href="/weather"]').click(),
    expectedUrl: /\/weather$/,
    assertDestination: expectWeatherPage,
  },
  {
    name: 'Notices section nav',
    click: (page) => page.page.locator('.section-nav a[href="/notices"]').click(),
    expectedUrl: /\/notices$/,
    assertDestination: expectNoticesPage,
  },
  {
    name: 'Meetings section nav',
    click: (page) => page.page.locator('.section-nav a[href="/meetings"]').click(),
    expectedUrl: /\/meetings$/,
    assertDestination: expectMeetingsPage,
  },
  {
    name: 'Services section nav',
    click: (page) => page.page.locator('.section-nav a[href="/services"]').click(),
    expectedUrl: /\/services$/,
    assertDestination: expectServicesPage,
  },
  {
    name: 'Records section nav',
    click: (page) => page.page.locator('.section-nav a[href="/records"]').click(),
    expectedUrl: /\/records$/,
    assertDestination: expectRecordsPage,
  },
  {
    name: 'Documents section nav',
    click: (page) => page.page.locator('.section-nav a[href="/documents"]').click(),
    expectedUrl: /\/documents$/,
    assertDestination: expectDocumentsPage,
  },
  {
    name: 'Accessibility section nav',
    click: (page) => page.page.locator('.section-nav a[href="/accessibility"]').click(),
    expectedUrl: /\/accessibility$/,
    assertDestination: expectAccessibilityPage,
  },
  {
    name: 'Businesses section nav',
    click: (page) => page.page.locator('.section-nav a[href="/businesses"]').click(),
    expectedUrl: /\/businesses$/,
    assertDestination: expectBusinessesPage,
  },
  {
    name: 'News section nav',
    click: (page) => page.page.locator('.section-nav a[href="/news"]').click(),
    expectedUrl: /\/news$/,
    assertDestination: expectNewsPage,
  },
  {
    name: 'Contact section nav',
    click: (page) => page.page.locator('.section-nav a[href="/contact"]').click(),
    expectedUrl: /\/contact$/,
    assertDestination: expectContactPage,
  },
];

const homepageGatewayTests: NavigationGateway[] = [
  {
    name: 'Header calendar shortcut',
    click: (page) => page.page.locator('.info-buttons .header-meta-link[href="/meetings#calendar"]').click(),
    expectedUrl: /\/meetings#calendar$/,
    assertDestination: expectMeetingsCalendar,
  },
  {
    name: 'Header top tasks shortcut',
    click: (page) => page.page.locator('.info-buttons .header-meta-link[href="/#top-tasks"]').click(),
    expectedUrl: /\/#top-tasks$/,
    assertDestination: expectTopTasksAnchor,
  },
  {
    name: 'Top task payment help card',
    click: (page) => page.page.locator('.task-card[href="/services#payment-help"]').click(),
    expectedUrl: /\/services#payment-help$/,
    assertDestination: expectServicePaymentHelp,
  },
  {
    name: 'Top task issue report card',
    click: (page) => page.page.locator('.task-card[href="/services#issue-report"]').click(),
    expectedUrl: /\/services#issue-report$/,
    assertDestination: expectServiceIssueReport,
  },
  {
    name: 'Top task meetings card',
    click: (page) => page.page.locator('.task-card[href="/meetings"]').click(),
    expectedUrl: /\/meetings$/,
    assertDestination: expectMeetingsPage,
  },
  {
    name: 'Top task records request card',
    click: (page) => page.page.locator('.task-card[href="/services#records-request"]').click(),
    expectedUrl: /\/services#records-request$/,
    assertDestination: expectServiceRecordsRequest,
  },
  {
    name: 'Homepage meetings calendar link',
    click: (page) =>
      page.page
        .locator('.content-grid .civic-panel')
        .first()
        .getByRole('link', { name: siteContent.heroActionLabels.calendar, exact: true })
        .click(),
    expectedUrl: /\/meetings#calendar$/,
    assertDestination: expectMeetingsCalendar,
  },
  {
    name: 'Homepage notices view-all link',
    click: (page) =>
      page.page
        .locator('.content-grid .civic-panel')
        .nth(1)
        .getByRole('link', { name: 'View all notices', exact: true })
        .click(),
    expectedUrl: /\/notices$/,
    assertDestination: expectNoticesPage,
  },
  {
    name: 'Feature card weather',
    click: (page) => page.page.locator('.feature-grid .feature-card[href="/weather"]').click(),
    expectedUrl: /\/weather$/,
    assertDestination: expectWeatherPage,
  },
  {
    name: 'Feature card notices',
    click: (page) => page.page.locator('.feature-grid .feature-card[href="/notices"]').click(),
    expectedUrl: /\/notices$/,
    assertDestination: expectNoticesPage,
  },
  {
    name: 'Feature card meetings',
    click: (page) => page.page.locator('.feature-grid .feature-card[href="/meetings"]').click(),
    expectedUrl: /\/meetings$/,
    assertDestination: expectMeetingsPage,
  },
  {
    name: 'Feature card services',
    click: (page) => page.page.locator('.feature-grid .feature-card[href="/services"]').click(),
    expectedUrl: /\/services$/,
    assertDestination: expectServicesPage,
  },
  {
    name: 'Feature card records',
    click: (page) => page.page.locator('.feature-grid .feature-card[href="/records"]').click(),
    expectedUrl: /\/records$/,
    assertDestination: expectRecordsPage,
  },
  {
    name: 'Feature card contact',
    click: (page) => page.page.locator('.feature-grid .feature-card[href="/contact"]').click(),
    expectedUrl: /\/contact$/,
    assertDestination: expectContactPage,
  },
  {
    name: 'Support strip weather card',
    click: (page) => page.page.locator('.support-link-card[href="/weather"]').click(),
    expectedUrl: /\/weather$/,
    assertDestination: expectWeatherPage,
  },
  {
    name: 'Footer accessibility link',
    click: (page) => page.page.locator('.footer-links a[href="/accessibility"]').click(),
    expectedUrl: /\/accessibility$/,
    assertDestination: expectAccessibilityPage,
  },
  {
    name: 'Footer records link',
    click: (page) => page.page.locator('.footer-links a[href="/records"]').click(),
    expectedUrl: /\/records$/,
    assertDestination: expectRecordsPage,
  },
  {
    name: 'Footer meetings link',
    click: (page) => page.page.locator('.footer-links a[href="/meetings"]').click(),
    expectedUrl: /\/meetings$/,
    assertDestination: expectMeetingsPage,
  },
  {
    name: 'Footer contact link',
    click: (page) => page.page.locator('.footer-links a[href="/contact"]').click(),
    expectedUrl: /\/contact$/,
    assertDestination: expectContactPage,
  },
];

const featurePageGateways: FeaturePageGateway[] = [
  {
    name: 'notices feature page',
    linkName: /Town notices/i,
    expectedUrl: /\/notices$/,
    assertDestination: async (homePage) => {
      await expect(homePage.noticeCards).toHaveCount(3);
    },
  },
  {
    name: 'meetings feature page',
    linkName: /Meetings and calendar/i,
    expectedUrl: /\/meetings$/,
    assertDestination: async (homePage) => {
      await expect(homePage.meetingCards).toHaveCount(3);
      await homePage.page.getByRole('tab', { name: 'Event list' }).click();
      await expect(homePage.page.locator('.calendar-table')).toBeVisible();
    },
  },
  {
    name: 'services feature page',
    linkName: /Resident services/i,
    expectedUrl: /\/services$/,
    assertDestination: async (homePage) => {
      await expect(homePage.serviceCards).toHaveCount(siteContent.serviceLabels.length);
      await expect(homePage.page.locator('#resident-services')).toBeVisible();
    },
  },
  {
    name: 'contact feature page',
    linkName: /Contact Town Hall/i,
    expectedUrl: /\/contact$/,
    assertDestination: async (homePage) => {
      await expect(homePage.contactCards.first()).toBeVisible();
      await expect(homePage.page.locator('#contact')).toContainText('Deb Dillon');
      await expect(homePage.page.locator('.leadership-card')).toHaveCount(2);
    },
  },
];

test.describe('homepage smoke', () => {
  test('proves the skip link and town logo navigation gateways function', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.keyboard.press('Tab');
    await expect(homePage.skipLink).toBeFocused();
    await homePage.page.keyboard.press('Enter');
    await expect(homePage.page).toHaveURL(/\/#main-content$/);
    await expect(homePage.mainContent).toBeVisible();

    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });
    await homePage.page.locator('.town-logo').click();

    await expect(homePage.page).toHaveURL(/\/$/);
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('renders the Wiley landing page scaffold', async ({ homePage }) => {
    await homePage.goto();

    await expect(homePage.page).toHaveTitle(siteContent.documentTitle);
    await expect(homePage.heroHeading).toContainText(siteContent.heading);
    await expect(homePage.searchInput).toBeVisible();
    await expect(homePage.featureCards).toHaveCount(6);
    await expect(homePage.topTaskCards).toHaveCount(4);
    await expect(homePage.page.locator('.feature-grid .feature-card[href="/weather"]')).toContainText(
      'Local weather',
    );
    await expect(homePage.page.locator('.feature-grid .feature-card[href="/records"]')).toContainText(
      'Records and documents',
    );
    await expect(homePage.page.locator('.support-strip')).toBeVisible();
    await expect(homePage.page.locator('#accessibility')).toHaveCount(0);
  });

  test('keeps the header shortcuts and header search usable', async ({ homePage }) => {
    await homePage.goto();

    const headerShortcuts = homePage.page.locator('.info-buttons .header-meta-link');
    const headerCalendarShortcut = homePage.page.locator(
      '.info-buttons .header-meta-link[href="/meetings#calendar"]',
    );
    const headerTopTasksShortcut = homePage.page.locator(
      '.info-buttons .header-meta-link[href="/#top-tasks"]',
    );

    await expect(headerShortcuts).toHaveCount(3);
    await expect(homePage.page.locator('.header-search-shell')).toBeVisible();
    await expect(homePage.searchInput).toBeVisible();

    await expect(headerCalendarShortcut).toHaveText(/Open the full town calendar/);
    await expect(headerCalendarShortcut).toHaveAttribute('href', '/meetings#calendar');

    await expect(headerTopTasksShortcut).toHaveText(/Quick Tasks/);
    await expect(headerTopTasksShortcut).toHaveAttribute('href', '/#top-tasks');

    await headerCalendarShortcut.click();

    await expect(homePage.page).toHaveURL(/\/meetings#calendar$/);
    await expect(homePage.page.locator('#calendar')).toBeVisible();

    await homePage.goto();

    await headerTopTasksShortcut.click();

    await expect(homePage.page).toHaveURL(/#top-tasks$/);
    await expect(homePage.page.locator('#top-tasks')).toBeVisible();
  });

  for (const gateway of sectionNavigationGateways) {
    test(`proves ${gateway.name} reaches the expected destination`, async ({ homePage }) => {
      await expectGatewayFromHomepage(homePage, gateway);
    });
  }

  for (const gateway of homepageGatewayTests) {
    test(`proves ${gateway.name} functions`, async ({ homePage }) => {
      await expectGatewayFromHomepage(homePage, gateway);
    });
  }

  for (const gateway of featurePageGateways) {
    test(`opens the ${gateway.name} from the homepage`, async ({ homePage }) => {
      await expectFeaturePageFromHomepage(homePage, gateway);
    });
  }

  test('surfaces the expected resident-first tasks', async ({ homePage }) => {
    await homePage.goto();

    for (const label of siteContent.topTaskHeadings) {
      await expect(homePage.topTaskCards.filter({ hasText: label })).toHaveCount(1);
    }
  });

  test('opens the local weather feature page from the homepage', async ({ homePage }) => {
    await homePage.enableAlertSignup('/mock-alert-signup');
    await homePage.goto();

    await homePage.page.locator('.feature-grid .feature-card[href="/weather"]').click();

    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
    await expect(homePage.weatherSignupShell).toBeVisible();
  });

  test('opens the public document hub from the records feature page', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.locator('.feature-grid .feature-card[href="/records"]').click();
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
    await homePage.page.locator('#search-panel .search-submit').click();

    await expect(homePage.page).toHaveURL(/\/documents#financial-documents$/);
    await expect(homePage.page.locator('#financial-documents')).toContainText(
      'Budget summaries and annual reports',
    );
  });
});
