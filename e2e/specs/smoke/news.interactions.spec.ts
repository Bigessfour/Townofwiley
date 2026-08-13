import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '../../fixtures/town.fixture';

const E2E_NEWSLETTER_PDF_PATH = '/fixtures/e2e-newsletter.pdf';
const E2E_NEWSLETTER_VIEWER_FRAGMENT = 'navpanes=0&pagemode=none&view=FitH';

const E2E_FEATURED_NOTICE_ID = 'e2e-featured-notice';

function buildNewsInteractionsCmsSnapshotBody(): string {
  const snapshotPath = resolve(process.cwd(), 'public/cms-snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, unknown>;
  const snapshotNotices = Array.isArray(snapshot.noticeRecords) ? snapshot.noticeRecords : [];

  return JSON.stringify({
    ...snapshot,
    externalNewsLinkRecords: [],
    noticeRecords: [
      {
        id: E2E_FEATURED_NOTICE_ID,
        title: 'Hydrant flushing',
        date: '2026-12-31',
        detail: 'Town-wide hydrant flushing scheduled this week.',
        priority: 1,
        imageUrl: null,
        active: true,
      },
      ...snapshotNotices,
    ],
  });
}

const E2E_STORYMAP_URL = 'https://storymaps.arcgis.com/stories/3e402c3303a84dcfb0d9ee6c60995349';

function buildStoryMapNoticeCmsSnapshotBody(): string {
  const snapshotPath = resolve(process.cwd(), 'public/cms-snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, unknown>;

  return JSON.stringify({
    ...snapshot,
    externalNewsLinkRecords: [],
    noticeRecords: [
      {
        id: 'e2e-storymap-notice',
        title: '2026 SECRHA Housing Needs Assessment',
        date: '2026-12-31',
        detail: '2026 SECRHA Housing Needs Assessment – Interactive Story Map',
        priority: 1,
        imageUrl: E2E_STORYMAP_URL,
        active: true,
      },
    ],
  });
}

function buildNewsletterPdfCmsSnapshotBody(): string {
  const snapshotPath = resolve(process.cwd(), 'public/cms-snapshot.json');
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, unknown>;

  return JSON.stringify({
    ...snapshot,
    noticeRecords: [
      {
        id: 'e2e-newsletter',
        title: 'E2E Test Newsletter',
        date: '2026-06-09',
        detail: 'Fixture newsletter used to verify inline PDF preview wiring.',
        announcementKind: 'newsletter',
        attachmentKey: E2E_NEWSLETTER_PDF_PATH,
        priority: 1,
        imageUrl: null,
        active: true,
      },
    ],
  });
}

/**
 * Newsletter PDF viewer: unit tests in `news.spec.ts` + `newsletter-pdf-viewer.vitest.ts`.
 * E2E uses a same-origin fixture PDF so Amplify/S3 presigning is not required in CI.
 */
test.describe('news page interactions', () => {
  test('renders featured and external news links', async ({ homePage }) => {
    await homePage.page.unroute('**/cms-snapshot.json');
    await homePage.page.route('**/cms-snapshot.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: buildNewsInteractionsCmsSnapshotBody(),
      });
    });

    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    await expect(
      homePage.page.getByRole('heading', { level: 1, name: 'Town News and Announcements' }),
    ).toBeVisible();

    const featuredNewsCard = homePage.page.locator('.featured-news-card');
    await expect(featuredNewsCard).toContainText('Featured town notice');
    await expect(featuredNewsCard).toContainText('Hydrant flushing');

    const featuredCardLink = homePage.page.locator('a.featured-news-card-link');
    await expect(featuredCardLink).toBeVisible();
    await expect(featuredCardLink).toHaveAttribute(
      'href',
      `/notices#notice-${E2E_FEATURED_NOTICE_ID}`,
    );
    await expect(featuredCardLink).toContainText('Read article');

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

  test('opens a StoryMap notice as an external link instead of an image', async ({ homePage }) => {
    await homePage.page.unroute('**/cms-snapshot.json');
    await homePage.page.route('**/cms-snapshot.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: buildStoryMapNoticeCmsSnapshotBody(),
      });
    });

    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    const featuredCardLink = homePage.page.locator('a.featured-news-card-link');
    await expect(featuredCardLink).toBeVisible();
    await expect(featuredCardLink).toHaveAttribute('href', E2E_STORYMAP_URL);
    await expect(featuredCardLink).toHaveAttribute('target', '_blank');
    await expect(featuredCardLink).toContainText('Open interactive Story Map');
    await expect(homePage.page.locator(`img[src="${E2E_STORYMAP_URL}"]`)).toHaveCount(0);
  });

  test('renders newsletter PDF iframe with thumbnail-hiding viewer params', async ({
    homePage,
  }) => {
    await homePage.page.route('**/cms-snapshot.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: buildNewsletterPdfCmsSnapshotBody(),
      });
    });

    await homePage.page.goto('/news', { waitUntil: 'domcontentloaded' });

    const newsletterHeading = homePage.page.getByRole('heading', {
      name: 'Newsletter from Town Hall',
    });
    await expect(newsletterHeading).toBeVisible();

    const iframe = homePage.page.getByTestId('newsletter-pdf-frame');
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute(
      'src',
      new RegExp(
        `${E2E_NEWSLETTER_PDF_PATH.replace('/', '\\/')}#${E2E_NEWSLETTER_VIEWER_FRAGMENT}$`,
      ),
    );
    await expect(iframe).not.toHaveAttribute('sandbox');

    const downloadLink = homePage.page.getByTestId('newsletter-download-link');
    await expect(downloadLink).toBeVisible();
    const downloadHref = await downloadLink.getAttribute('href');
    expect(downloadHref).toMatch(new RegExp(`${E2E_NEWSLETTER_PDF_PATH.replace('/', '\\/')}$`));
    expect(downloadHref).not.toContain('navpanes=0');
  });
});
