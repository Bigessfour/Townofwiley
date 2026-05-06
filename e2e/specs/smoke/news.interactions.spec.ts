import { expect, test } from '../../fixtures/town.fixture';

test.describe('news page interactions', () => {
  test('renders featured and external news links', async ({ homePage }) => {
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Town News and Announcements' }),
    ).toBeVisible();

    const featuredNewsCard = homePage.page.locator('.featured-news-card');
    await expect(featuredNewsCard).toContainText('Featured town notice');
    await expect(featuredNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      '/notices',
    );

    const externalNewsCard = homePage.page.locator('.news-card--external').first();
    await expect(externalNewsCard).toContainText('Lamar Ledger');
    await expect(externalNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      'https://www.lamarledger.com/',
    );
    await expect(externalNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  test('renders the latest Town newsletter PDF inline when CMS provides attachmentKey', async ({
    homePage,
  }) => {
    const mockCmsEndpoint = 'https://mock-cms.test/graphql';
    const mockNewsletterUrl = 'https://newsletter-mock.test/2026-05-newsletter.pdf';

    // Override the empty CMS endpoint set by the shared fixture so the AppSync request actually fires.
    await homePage.page.addInitScript(
      (args) => {
        const [endpoint, apiKey] = args as [string, string];
        const runtimeWindow = window as Window & {
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
            cms?: {
              appSync?: { region?: string; apiEndpoint?: string; apiKey?: string };
            };
          };
        };
        runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
          cms: {
            ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms ?? {}),
            appSync: {
              region: 'us-east-2',
              apiEndpoint: endpoint,
              apiKey,
            },
          },
        };
      },
      [mockCmsEndpoint, 'da2-newsletter-test-key'],
    );

    await homePage.page.route(mockCmsEndpoint, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            listSiteSettings: { items: [] },
            listAlertBanners: { items: [] },
            listAnnouncements: {
              items: [
                {
                  id: 'newsletter-april-2026',
                  title: 'April 2026 Newsletter',
                  date: '2026-04-01',
                  detail: 'Older newsletter content.',
                  announcementKind: 'newsletter',
                  attachmentKey: 'https://newsletter-mock.test/2026-04-newsletter.pdf',
                  priority: 2,
                  imageUrl: null,
                  active: true,
                },
                {
                  id: 'newsletter-may-2026',
                  title: 'May 2026 Newsletter',
                  date: '2026-05-06',
                  detail: 'Latest newsletter content.',
                  announcementKind: 'newsletter',
                  attachmentKey: mockNewsletterUrl,
                  priority: 1,
                  imageUrl: null,
                  active: true,
                },
              ],
            },
            listEvents: { items: [] },
            listOfficialContacts: { items: [] },
            listBusinesses: { items: [] },
            listPublicDocuments: { items: [] },
            listExternalNewsLinks: { items: [] },
          },
        }),
      });
    });

    // Stub the PDF responses with a tiny valid header so the iframe load doesn't surface a network
    // error in the headless browser (content shape does not matter for the assertions).
    await homePage.page.route('https://newsletter-mock.test/**.pdf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4\n%mock\n%%EOF\n'),
      });
    });

    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    // Only the latest active newsletter renders.
    await expect(homePage.page.locator('.newsletter-item-card')).toHaveCount(1);
    await expect(homePage.page.locator('#town-newsletter-heading')).toHaveText(
      'Newsletter from Town Hall',
    );
    await expect(homePage.page.locator('.newsletter-item-card h3')).toHaveText(
      'May 2026 Newsletter',
    );

    const iframe = homePage.page.locator('[data-testid=newsletter-pdf-frame]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('title', /Town newsletter PDF.*May 2026 Newsletter/);
    await expect(iframe).toHaveAttribute('loading', 'lazy');
    await expect(iframe).toHaveAttribute('sandbox', /allow-same-origin/);

    const downloadLink = homePage.page.locator('[data-testid=newsletter-download-link]');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', mockNewsletterUrl);
    await expect(downloadLink).toHaveAttribute('target', '_blank');
    await expect(downloadLink).toHaveAttribute('rel', /noopener/);
    await expect(downloadLink).toContainText('Open newsletter PDF in a new tab');
  });
});
