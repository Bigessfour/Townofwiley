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
  href: string;
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
  await expect(homePage.noticeCards).toHaveCount(siteContent.homepageCounts.noticeCards);
}

async function expectMeetingsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
}

async function expectMeetingsCalendar(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
}

async function expectServicesPage(homePage: HomePage): Promise<void> {
  await expect(homePage.serviceCards).toHaveCount(siteContent.homepageCounts.serviceCards);
  await expect(homePage.page.locator('#resident-services')).toBeVisible();
}

async function expectRecordsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.getByTestId('records-guide-packets')).toBeVisible();
  await expect(
    homePage.page.getByTestId('records-guide-packets').getByRole('link', {
      name: 'Open meeting documents destination',
    }),
  ).toBeVisible();
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

async function expectContactPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#contact')).toContainText('Deb Dillon');
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

  const featureGrid = homePage.page.getByRole('region', { name: siteContent.featureHubHeading });
  const featureCard = featureGrid.locator(`.feature-card[href="${gateway.href}"]`);

  await expect(featureCard, gateway.name).toBeVisible();
  await featureCard.scrollIntoViewIfNeeded();
  await featureCard.click();

  await expect(homePage.page, gateway.name).toHaveURL(gateway.expectedUrl);
  await gateway.assertDestination(homePage);
}

const sectionNavigationGateways: NavigationGateway[] = [
  {
    name: 'Businesses mega menu root',
    click: (page) =>
      page.sectionNavLinks
        .filter({ hasText: 'Businesses & Community' })
        .first()
        .click({ position: { x: 5, y: 5 } }),
    expectedUrl: /\/businesses$/,
    assertDestination: expectBusinessesPage,
  },
  {
    name: 'Contact mega menu root',
    click: (page) =>
      page.sectionNavLinks
        .filter({ hasText: 'Contact & Town Hall' })
        .first()
        .click({ position: { x: 5, y: 5 } }),
    expectedUrl: /\/contact$/,
    assertDestination: expectContactPage,
  },
];

const homepageGatewayTests: NavigationGateway[] = [
  {
    name: 'Meetings panel calendar shortcut',
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
    name: 'Top Tasks hash route',
    click: (page) => page.page.goto('/#top-tasks', { waitUntil: 'commit' }),
    expectedUrl: /#top-tasks$/,
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
    href: '/notices',
    expectedUrl: /\/notices$/,
    assertDestination: async (homePage) => {
      await expect(homePage.noticeCards.first()).toBeVisible();
    },
  },
  {
    name: 'meetings feature page',
    href: '/meetings',
    expectedUrl: /\/meetings$/,
    assertDestination: async (homePage) => {
      await expect(homePage.meetingCards).toHaveCount(siteContent.homepageCounts.meetingCards);
      await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
      await expect(homePage.page.locator('.calendar-card')).toHaveCount(
        siteContent.homepageCounts.meetingCards,
      );
    },
  },
  {
    name: 'services feature page',
    href: '/services',
    expectedUrl: /\/services$/,
    assertDestination: async (homePage) => {
      await expect(homePage.serviceCards).toHaveCount(siteContent.homepageCounts.serviceCards);
      await expect(homePage.page.locator('#resident-services')).toBeVisible();
    },
  },
  {
    name: 'contact feature page',
    href: '/contact',
    expectedUrl: /\/contact$/,
    assertDestination: async (homePage) => {
      await expect(homePage.page.locator('#contact')).toContainText('Deb Dillon');
      await expect(homePage.page.locator('#contact')).toContainText('Deb Dillon');
      await expect(homePage.page.locator('.leadership-card')).toHaveCount(2);
    },
  },
];

test.describe('homepage smoke', () => {
  test.describe.configure({ timeout: 90000 });

  test('proves the skip link and town logo navigation gateways function', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'Desktop covers hardware-keyboard skip-link behavior; mobile emulation is not stable for this combined flow.',
    );

    await homePage.goto();

    await homePage.skipLink.focus();
    await expect(homePage.skipLink).toBeFocused();
    await homePage.page.keyboard.press('Enter');
    await expect(homePage.page).toHaveURL(/\/#main-content$/);
    await expect(homePage.mainContent).toBeVisible();

    await homePage.page.goto('/services', { waitUntil: 'domcontentloaded' });
    await homePage.page.locator('.town-logo').click();

    await expect(homePage.page).toHaveURL(/\/$/);
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('renders the Wiley landing page scaffold', async ({ homePage }, testInfo) => {
    await homePage.goto();

    await expect(homePage.page).toHaveTitle(siteContent.documentTitle);
    await homePage.heroHeading.scrollIntoViewIfNeeded();
    await expect(homePage.heroHeading).toContainText(siteContent.heading);
    if (testInfo.project.name === 'mobile-chromium') {
      await expect(homePage.mobileMenuButton).toBeVisible();
    } else {
      await expect(homePage.searchInput).toBeVisible();
    }
    await expect(homePage.featureCards).toHaveCount(6);
    await expect(homePage.topTaskCards).toHaveCount(4);
    await expect(
      homePage.page.locator('.feature-grid .feature-card[href="/weather"]'),
    ).toContainText('Local weather');
    await expect(
      homePage.page.locator('.feature-grid .feature-card[href="/records"]'),
    ).toContainText('Records and documents');
    await expect(homePage.page.locator('.support-strip')).toBeVisible();
    await expect(homePage.page.locator('#accessibility')).toHaveCount(0);
  });

  test('keeps the megamenu header search and meetings calendar shortcut usable', async ({
    homePage,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'Site search and megamenu chrome are hidden below the desktop breakpoint; mobile coverage uses drawer links.',
    );

    await homePage.goto();

    await expect(homePage.searchInput).toBeVisible();

    const calendarShortcut = homePage.page
      .locator('.content-grid .civic-panel')
      .first()
      .getByRole('link', { name: siteContent.heroActionLabels.calendar, exact: true });

    await expect(calendarShortcut).toBeVisible();
    // routerLink + fragment serializes as /meetings#calendar in the DOM.
    await expect(calendarShortcut).toHaveAttribute('href', /\/meetings(#calendar)?$/);

    await calendarShortcut.click();

    await expect(homePage.page).toHaveURL(/\/meetings#calendar$/);
    await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });

    await homePage.goto();

    await homePage.page.goto('/#top-tasks', { waitUntil: 'commit' });
    await expect(homePage.heroHeading).toBeVisible();

    await expect(homePage.page).toHaveURL(/#top-tasks$/);
    await expect(homePage.page.locator('#top-tasks')).toBeVisible();
  });

  for (const gateway of sectionNavigationGateways) {
    test(`proves ${gateway.name} reaches the expected destination`, async ({
      homePage,
    }, testInfo) => {
      test.skip(
        testInfo.project.name === 'mobile-chromium',
        'Mega menu roots are not rendered on narrow viewports.',
      );

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

    const taskGrid = homePage.page.locator('.landing-task-grid');
    /** Matches `APP_COPY.en.topTasks` href order in `app.ts` (titles also in `siteContent.topTaskHeadings`). */
    const topTaskHrefs = [
      '/services#payment-help',
      '/services#issue-report',
      '/meetings',
      '/services#records-request',
    ] as const;

    await expect(taskGrid.locator('a.task-card')).toHaveCount(topTaskHrefs.length, {
      timeout: 25_000,
    });
    for (const href of topTaskHrefs) {
      await expect(taskGrid.locator(`a.task-card[href="${href}"]`)).toHaveCount(1);
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
    await homePage.page
      .getByTestId('records-guide-packets')
      .getByRole('link', { name: 'Open meeting documents destination' })
      .click();

    await expect(homePage.page).toHaveURL(/\/documents#meeting-documents$/);
    await expect(homePage.page.getByTestId('document-hub-title')).toContainText(
      siteContent.cmsHeadings.documentsHub,
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

    await homePage.submitHeaderSiteSearch('Browse budgets annual reports code references');

    await expect(homePage.page).toHaveURL(/\/documents#financial-documents$/);
    await expect(homePage.page.getByTestId('financial-documents')).toContainText(
      'Budget summaries and annual reports',
    );
  });
});
