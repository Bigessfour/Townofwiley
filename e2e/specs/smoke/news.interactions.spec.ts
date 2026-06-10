import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '../../fixtures/town.fixture';

const E2E_NEWSLETTER_PDF_PATH = '/fixtures/e2e-newsletter.pdf';
const E2E_NEWSLETTER_VIEWER_FRAGMENT = 'navpanes=0&pagemode=none&view=FitH';

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
