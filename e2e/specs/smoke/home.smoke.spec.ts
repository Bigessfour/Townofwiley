import { expect, test } from '../../fixtures/town.fixture';
import type { HomePage } from '../../pages/home.page';
import { revealHomepageDeferredBlocks } from '../../support/homepage-defer';
import { siteContent } from '../../support/site-content';

interface NavigationGateway {
  name: string;
  click: (homePage: HomePage) => Promise<void>;
  expectedUrl: RegExp;
  assertDestination: (homePage: HomePage) => Promise<void>;
}

interface FeaturePageGateway {
  name: string;
  click: (homePage: HomePage) => Promise<void>;
  expectedUrl: RegExp;
  assertDestination: (homePage: HomePage) => Promise<void>;
}

async function expectGatewayFromHomepage(
  homePage: HomePage,
  gateway: NavigationGateway,
): Promise<void> {
  await homePage.goto();
  await revealHomepageDeferredBlocks(homePage);

  await gateway.click(homePage);
  await expect(homePage.page, gateway.name).toHaveURL(gateway.expectedUrl);
  await gateway.assertDestination(homePage);
}

async function expectWeatherPage(homePage: HomePage): Promise<void> {
  await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
}

async function expectNoticesPage(homePage: HomePage): Promise<void> {
  await expect(
    homePage.page.getByRole('heading', { level: 1, name: 'Town News and Announcements' }),
  ).toBeVisible();
  await expect(homePage.noticeCards.first()).toBeVisible();
}

async function expectMeetingsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
}

async function expectMeetingsCalendar(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
}

async function expectServicesPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#resident-services')).toBeVisible();
  await expect(homePage.residentServiceToggles).toHaveCount(3);
}

async function expectRecordsPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.getByTestId('contact-town-hall')).toBeVisible();
}

async function expectAccessibilityPage(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#barrier-report')).toBeVisible({ timeout: 20_000 });
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

async function expectPayBillPage(homePage: HomePage): Promise<void> {
  await expect(
    homePage.page.getByRole('heading', { level: 1, name: 'Pay Your Utility Bill Online' }),
  ).toBeVisible();
}

async function expectServiceIssueReport(homePage: HomePage): Promise<void> {
  await expect(homePage.page.locator('#issue-report')).toBeVisible();
}

async function expectServiceRecordsRequest(homePage: HomePage): Promise<void> {
  await expect(homePage.page.getByTestId('contact-town-hall')).toBeVisible();
}

async function expectFeaturePageFromHomepage(
  homePage: HomePage,
  gateway: FeaturePageGateway,
): Promise<void> {
  await homePage.goto();
  await revealHomepageDeferredBlocks(homePage);

  await gateway.click(homePage);

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
    name: 'Top task utility bill payment card',
    click: (page) => page.page.locator('.task-card[href="/pay-bill"]').click(),
    expectedUrl: /\/pay-bill$/,
    assertDestination: expectPayBillPage,
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
    name: 'Top task contact clerk card',
    click: (page) => page.page.locator('.task-card[href="/contact"]').click(),
    expectedUrl: /\/contact$/,
    assertDestination: expectServiceRecordsRequest,
  },
  {
    name: 'Compact weather forecast link',
    click: (page) =>
      page.page.locator('#homepage-weather').getByRole('link', { name: 'Local weather' }).click(),
    expectedUrl: /\/weather$/,
    assertDestination: expectWeatherPage,
  },
  {
    name: 'View all news link',
    click: (page) => page.page.getByRole('link', { name: 'View all news', exact: true }).click(),
    expectedUrl: /\/news$/,
    assertDestination: expectNoticesPage,
  },
  {
    name: 'Hero view meetings link',
    click: (page) => page.page.getByRole('link', { name: 'View meetings', exact: true }).click(),
    expectedUrl: /\/meetings$/,
    assertDestination: expectMeetingsPage,
  },
  {
    name: 'Hero explore services link',
    click: (page) => page.page.getByRole('link', { name: /Explore resident services/i }).click(),
    expectedUrl: /\/services$/,
    assertDestination: expectServicesPage,
  },
  {
    name: 'Footer accessibility link',
    click: (page) => page.page.locator('.footer-links a[href="/accessibility"]').click(),
    expectedUrl: /\/accessibility$/,
    assertDestination: expectAccessibilityPage,
  },
  {
    name: 'Footer records link',
    click: (page) =>
      page.page
        .locator('.footer-links')
        .getByRole('link', { name: 'Contact the Town Clerk' })
        .click(),
    expectedUrl: /\/contact$/,
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
    click: (page) =>
      page.page.locator('.footer-links').getByRole('link', { name: 'Contact Town Hall' }).click(),
    expectedUrl: /\/contact$/,
    assertDestination: expectContactPage,
  },
];

const featurePageGateways: FeaturePageGateway[] = [
  {
    name: 'news hub',
    click: (page) => page.page.getByRole('link', { name: 'View all news', exact: true }).click(),
    expectedUrl: /\/news$/,
    assertDestination: async (homePage) => {
      await expect(homePage.noticeCards.first()).toBeVisible();
    },
  },
  {
    name: 'meetings feature page',
    click: (page) => page.page.locator('a.task-card[href="/meetings"]').click(),
    expectedUrl: /\/meetings$/,
    assertDestination: async (homePage) => {
      await expect(homePage.page.locator('#calendar')).toBeVisible({ timeout: 20000 });
      await expect(homePage.page.locator('.meetings-table tbody tr').first()).toBeVisible({
        timeout: 20000,
      });
      await expect(homePage.page.locator('#meetings-next')).toBeVisible({
        timeout: 20000,
      });
    },
  },
  {
    name: 'services feature page',
    click: (page) => page.page.getByRole('link', { name: /Explore resident services/i }).click(),
    expectedUrl: /\/services$/,
    assertDestination: async (homePage) => {
      await expect(homePage.page.locator('#resident-services')).toBeVisible();
      await expect(homePage.residentServiceToggles).toHaveCount(3);
    },
  },
  {
    name: 'contact feature page',
    click: (page) => page.page.locator('a.task-card[href="/contact"]').click(),
    expectedUrl: /\/contact$/,
    assertDestination: async (homePage) => {
      await expect(homePage.page.locator('#contact')).toContainText('Deb Dillon');
      await expect(homePage.page.getByTestId('contact-town-hall')).toBeVisible();
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
    await homePage.clickTownLogoHome();

    await expect(homePage.page).toHaveURL(/\/$/);
    await expect(homePage.heroHeading).toBeVisible();
  });

  test('renders the deferred compact weather panel after the homepage scrolls into view', async ({
    homePage,
  }) => {
    await homePage.goto();

    await revealHomepageDeferredBlocks(homePage);

    const weatherSection = homePage.page.locator('#homepage-weather');
    await expect(weatherSection).toBeVisible();
    await expect(homePage.page.locator('#homepage-weather-heading')).toBeVisible();
    await expect(homePage.page.locator('.weather-compact')).toBeVisible();
    await expect(homePage.page.getByRole('link', { name: 'Open full forecast' })).toBeVisible();

    await expect(homePage.page.locator('.homepage-defer-placeholder--weather')).toHaveCount(0);
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
    await revealHomepageDeferredBlocks(homePage);
    await expect(homePage.topTaskCards).toHaveCount(5);
    await expect(homePage.page.locator('#homepage-weather')).toBeVisible();
    await expect(homePage.page.locator('.weather-compact')).toBeVisible();
    await expect(homePage.page.getByRole('link', { name: 'View all news' })).toBeVisible();
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
      '/pay-bill',
      '/services#issue-report',
      '/meetings',
      '/meetings#community',
      '/contact',
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

    await revealHomepageDeferredBlocks(homePage);
    await homePage.page
      .locator('#homepage-weather')
      .getByRole('link', { name: 'Local weather' })
      .click();

    await expect(homePage.page).toHaveURL(/\/weather$/);
    await expect(homePage.weatherHeading).toContainText('National Weather Service forecast');
    await expect(homePage.weatherSignupShell).toBeVisible();
  });

  test('opens the meetings archive from the meetings feature page', async ({ homePage }) => {
    await homePage.goto();

    await revealHomepageDeferredBlocks(homePage);
    await homePage.page.locator('.task-card[href="/meetings"]').click();

    await expect(homePage.page).toHaveURL(/\/meetings$/);
    await expect(homePage.page.getByTestId('meeting-documents-archive')).toBeVisible();
  });

  test('opens the accessibility detail page from the footer', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page.getByRole('link', { name: 'Accessibility statement' }).click();

    await expect(homePage.page).toHaveURL(/\/accessibility$/);
    await expect(homePage.page.locator('#barrier-report')).toBeVisible({ timeout: 20_000 });
    await expect(homePage.page.locator('#barrier-report')).toContainText(
      'Open accessibility report email',
    );
  });

  test('routes search results into clerk contact for document requests', async ({ homePage }) => {
    await homePage.goto();

    await homePage.page
      .locator('.search-suggestion')
      .filter({ hasText: 'Contact the Town Clerk' })
      .click();
    const clerkHit = homePage.page
      .locator('a.search-result')
      .filter({ hasText: /Contact the Town Clerk/i })
      .first();
    await expect(clerkHit).toBeVisible({ timeout: 5_000 });
    await clerkHit.click();

    await expect(homePage.page).toHaveURL(/\/contact$/);
    await expect(homePage.page.getByTestId('contact-town-hall')).toBeVisible();
  });
});
