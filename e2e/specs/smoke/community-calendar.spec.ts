import { expect, test } from '../../fixtures/town.fixture';

const MOCK_EVENTS = {
  events: [
    {
      eventId: 'evt-1',
      title: 'Neighborhood Yard Sale',
      description: 'All ages welcome.',
      category: 'yard_sale',
      location: '100 Main Street, Wiley CO',
      startDateTime: '2099-08-01T16:00:00.000Z',
      endDateTime: '2099-08-01T20:00:00.000Z',
    },
  ],
};

async function mockCommunityCalendarApi(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.addInitScript(() => {
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: Record<string, unknown>;
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
      communityCalendar: {
        apiEndpoint: '/mock-community-calendar',
      },
    };
  });

  await page.route('**/mock-community-calendar/events**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EVENTS),
      });
      return;
    }
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          eventId: 'evt-new',
          message: 'Thank you. The Town Clerk will review your event.',
        }),
      });
      return;
    }
    await route.fallback();
  });
}

// Exercises CommunityCalendarPanel + CommunityCalendarRedirect on the public site.
test.describe('community calendar on meetings', () => {
  test('redirects /community-calendar to /meetings#community', async ({ homePage }) => {
    await homePage.page.goto('/community-calendar', { waitUntil: 'domcontentloaded' });
    await expect(homePage.page).toHaveURL(/\/meetings#community/);
  });

  test('shows bilingual community section, validates submit, and lists mocked events', async ({
    homePage,
  }) => {
    await mockCommunityCalendarApi(homePage.page);

    await homePage.page.goto('/meetings#community', { waitUntil: 'domcontentloaded' });
    await expect(
      homePage.page.getByRole('heading', { level: 1, name: /Council meetings/i }),
    ).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', { level: 2, name: 'Community events' }),
    ).toBeVisible();
    await expect(
      homePage.page.getByRole('heading', { level: 4, name: 'Neighborhood Yard Sale' }),
    ).toBeVisible();
    await expect(homePage.page.getByText('Yard sale').first()).toBeVisible();

    await homePage.page.getByRole('button', { name: 'Submit for Clerk review' }).click();
    await expect(homePage.page.locator('#community-submitter-name:invalid')).toBeVisible();

    await homePage.page.locator('#community-submitter-name').fill('Jane Resident');
    await homePage.page.locator('#community-submitter-phone').fill('7195551212');
    await homePage.page.locator('#community-submitter-email').fill('jane@example.com');
    await homePage.page.locator('#community-location').fill('200 Main Street');
    await homePage.page.locator('#community-title').fill('Bake Sale Fundraiser');
    await homePage.page.locator('#community-start').fill('2099-09-01T10:00');
    await homePage.page
      .locator('#community-description')
      .fill('Cookies and coffee for the school.');
    await homePage.page.getByRole('button', { name: 'Submit for Clerk review' }).click();
    await expect(homePage.page.getByText('Submission received')).toBeVisible({ timeout: 10_000 });

    await homePage.clickSiteLanguage('es');
    await expect(homePage.page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(
      homePage.page.getByRole('heading', { level: 2, name: 'Eventos comunitarios' }),
    ).toBeVisible();
    await expect(homePage.page.getByRole('button', { name: 'Enviar para revisión' })).toBeVisible();
  });
});

test.describe('this week in Wiley on homepage', () => {
  test('shows Coming up / This week card with community yard sale seed', async ({ homePage }) => {
    await homePage.goto();
    const section = homePage.page.getByTestId('this-week-in-wiley');
    await expect(section).toBeVisible();
    await expect(
      section.getByRole('heading', {
        level: 2,
        name: /This week in Wiley|Coming up in Wiley/i,
      }),
    ).toBeVisible();
    await expect(section.getByText(/Community-wide yard sale/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(section.getByRole('link', { name: /Open the calendar/i })).toBeVisible();
  });
});
