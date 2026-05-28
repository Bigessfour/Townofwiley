import type { Page } from '@playwright/test';

/** CMS snapshot with more than three notices so `showBrowseNoticesLink()` is true on the homepage. */
export async function mockCmsSnapshotWithExtraNotices(
  page: Page,
  noticeCount = 4,
): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem('tow-cms-snapshot-v1');
  });

  await page.route('**/cms-snapshot.json', async (route) => {
    const response = await route.fetch();
    const snapshot = (await response.json()) as {
      noticeRecords?: Array<{
        id: string;
        title: string;
        date?: string;
        detail: string;
        active: boolean;
      }>;
    };

    snapshot.noticeRecords = Array.from({ length: noticeCount }, (_, index) => ({
      id: `inventory-notice-${index + 1}`,
      title: `Inventory notice ${index + 1}`,
      date: '2099-01-01',
      detail: 'Synthetic notice for view-all link inventory coverage.',
      active: true,
    }));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshot),
    });
  });
}
