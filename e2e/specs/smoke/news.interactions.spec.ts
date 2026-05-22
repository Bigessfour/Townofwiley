import { type Route, expect, test } from '@playwright/test';
import { expect as townExpect, test as townTest } from '../../fixtures/town.fixture';
import { resolveE2eEnv } from '../../support/resolve-e2e-env';

const { baseURL: configuredBaseUrl } = resolveE2eEnv();

townTest.describe('news page interactions', () => {
  townTest('renders featured and external news links', async ({ homePage }) => {
    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    await townExpect(
      homePage.page.getByRole('heading', { level: 1, name: 'Town News and Announcements' }),
    ).toBeVisible();

    const featuredNewsCard = homePage.page.locator('.featured-news-card');
    await townExpect(featuredNewsCard).toContainText('Featured town notice');
    await townExpect(featuredNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      '/notices',
    );

    const externalNewsCard = homePage.page.locator('.news-card--external').first();
    await townExpect(externalNewsCard).toContainText('Lamar Ledger');
    await townExpect(externalNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'href',
      'https://www.lamarledger.com/',
    );
    await townExpect(externalNewsCard.getByRole('link', { name: 'Read article' })).toHaveAttribute(
      'target',
      '_blank',
    );
  });
});

/**
 * Newsletter CMS mock runs in a fresh browser context so the shared town fixture
 * does not inject empty AppSync settings (which prevent GetPublicCmsContent POSTs).
 */
test.describe('news page newsletter CMS mock', () => {
  test('renders the latest Town newsletter PDF inline when CMS provides attachmentKey', async ({
    browser,
    baseURL,
  }) => {
    const mockCmsEndpoint = 'https://mock-cms.test/graphql';
    const mockNewsletterUrl = 'https://newsletter-mock.test/2026-05-newsletter.pdf';
    const resolvedBaseUrl = baseURL ?? configuredBaseUrl;

    const context = await browser.newContext();
    await context.addInitScript(
      (args) => {
        const { endpoint, apiKey } = args as { endpoint: string; apiKey: string };
        window.localStorage.setItem('tow-site-language', 'en');
        window.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
          cms: {
            appSync: {
              region: 'us-east-2',
              apiEndpoint: endpoint,
              apiKey,
            },
          },
          chatbot: {
            provider: 'easyPeasy',
            mode: 'none',
            chatUrl: '',
            buttonPosition: 'bottom-right',
            apiEndpoint: '',
          },
          payments: {
            provider: 'paystar',
            paystar: {
              mode: 'none',
              portalUrl: '',
              apiEndpoint: '',
            },
          },
        };
      },
      { endpoint: mockCmsEndpoint, apiKey: 'da2-newsletter-test-key' },
    );

    const page = await context.newPage();

    const cmsMockBody = JSON.stringify({
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
    });

    const fulfillCmsGraphql = async (route: Route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }
      const body = request.postData() ?? '';
      if (!body.includes('GetPublicCmsContent')) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'x-e2e-cms-mock': '1' },
        body: cmsMockBody,
      });
    };

    await page.route('**/runtime-config.js', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.__TOW_RUNTIME_CONFIG__ = {
          cms: {
            appSync: {
              region: 'us-east-2',
              apiEndpoint: '${mockCmsEndpoint}',
              apiKey: 'da2-newsletter-test-key'
            }
          }
        };`,
      });
    });

    await page.route(mockCmsEndpoint, fulfillCmsGraphql);
    await page.route('**/*appsync-api*.amazonaws.com/**', fulfillCmsGraphql);

    await page.route('https://newsletter-mock.test/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('%PDF-1.4\n%mock\n%%EOF\n'),
      });
    });

    await page.goto(`${resolvedBaseUrl}/news`, { waitUntil: 'networkidle' });

    await expect(page.locator('#town-newsletter-heading')).toBeVisible({ timeout: 30000 });

    await expect(page.locator('.newsletter-item-card')).toHaveCount(1);
    await expect(page.locator('#town-newsletter-heading')).toHaveText(
      'Newsletter from Town Hall',
    );
    await expect(page.locator('.newsletter-item-card h3')).toHaveText('May 2026 Newsletter');

    const iframe = page.locator('[data-testid=newsletter-pdf-frame]');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute('title', /Town newsletter PDF.*May 2026 Newsletter/);
    await expect(iframe).toHaveAttribute('loading', 'lazy');
    await expect(iframe).toHaveAttribute('sandbox', /allow-same-origin/);

    const downloadLink = page.locator('[data-testid=newsletter-download-link]');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('href', mockNewsletterUrl);
    await expect(downloadLink).toHaveAttribute('target', '_blank');
    await expect(downloadLink).toHaveAttribute('rel', /noopener/);
    await expect(downloadLink).toContainText('Open newsletter PDF in a new tab');

    await context.close();
  });
});
