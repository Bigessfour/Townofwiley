import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HomePage } from '../pages/home.page';
import { E2E_PUBLIC_DOCUMENT_RECORDS } from '../support/e2e-public-document-records';
import { resolveE2eEnv } from '../support/resolve-e2e-env';
import { mockDirectNwsRoutes } from '../support/weather-mocks';

interface TownFixtures {
  homePage: HomePage;
}

const { baseURL: configuredBaseUrl } = resolveE2eEnv();
const cmsSnapshotPath = resolve(process.cwd(), 'public/cms-snapshot.json');
let cachedCmsSnapshot: Record<string, unknown> | null = null;

function loadCmsSnapshotForE2e(): Record<string, unknown> {
  if (!cachedCmsSnapshot) {
    cachedCmsSnapshot = JSON.parse(readFileSync(cmsSnapshotPath, 'utf8')) as Record<
      string,
      unknown
    >;
  }
  return cachedCmsSnapshot;
}

interface E2eNoticeRecord {
  id: string;
  announcementKind?: string | null;
  attachmentKey?: string | null;
  active?: boolean;
}

/** Newsletter PDFs resolve to presigned S3 URLs that 403 in CI; keep copy, drop attachment for smoke. */
function sanitizeNoticeRecordsForE2e(records: unknown[]): E2eNoticeRecord[] {
  return records.map((record) => {
    if (typeof record !== 'object' || record === null || !('id' in record)) {
      return record as E2eNoticeRecord;
    }

    const notice = record as E2eNoticeRecord;
    const kind = (notice.announcementKind ?? '').toLowerCase();
    if (kind !== 'newsletter' || !notice.attachmentKey) {
      return notice;
    }

    const { attachmentKey: _removed, ...withoutAttachment } = notice;
    return withoutAttachment;
  });
}

function mergeE2eArchiveDocumentSeeds(snapshotRecords: unknown[]): unknown[] {
  const records = [...snapshotRecords];
  const existingIds = new Set(
    records
      .filter((record): record is { id: string } => {
        return typeof record === 'object' && record !== null && 'id' in record;
      })
      .map((record) => record.id),
  );

  for (const seed of E2E_PUBLIC_DOCUMENT_RECORDS) {
    if (!existingIds.has(seed.id)) {
      records.push(seed);
    }
  }

  return records;
}

function buildE2eCmsSnapshotBody(snapshot: Record<string, unknown>): string {
  const snapshotDocuments = Array.isArray(snapshot.publicDocumentRecords)
    ? snapshot.publicDocumentRecords
    : [];
  const snapshotNotices = Array.isArray(snapshot.noticeRecords) ? snapshot.noticeRecords : [];

  return JSON.stringify({
    ...snapshot,
    eventRecords: [],
    businessRecords: [],
    noticeRecords: sanitizeNoticeRecordsForE2e(snapshotNotices),
    publicDocumentRecords: mergeE2eArchiveDocumentSeeds(snapshotDocuments),
  });
}

export const test = base.extend<TownFixtures>({
  /** Auto: inventory and page-object specs must get CMS/NWS mocks even when they only request `documentsPage`, etc. */
  homePage: [
    async ({ page, baseURL }, use) => {
      await page.addInitScript(() => {
        if (!window.localStorage.getItem('tow-site-language')) {
          window.localStorage.setItem('tow-site-language', 'en');
        }
        window.localStorage.removeItem('towCowPopupSeen');
        // Stale snapshots can omit PublicDocument rows and break meetings archive smoke tests.
        window.localStorage.removeItem('tow-cms-snapshot-v1');
      });

      await page.addInitScript(() => {
        const runtimeWindow = window as Window & {
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
            cms?: {
              appSync?: {
                region?: string;
                apiEndpoint?: string;
                apiKey?: string;
              };
            };
          };
        };

        runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
          chatbot: {
            provider: 'none',
            mode: 'none',
            chatUrl: '',
            buttonPosition: 'bottom-right',
            apiEndpoint: '',
          },
          cms: {
            ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms ?? {}),
            appSync: {
              region: '',
              apiEndpoint: '',
              apiKey: '',
            },
          },
          billPay: {
            apiEndpoint: '',
          },
        };
      });

      await page.route('**/cms-snapshot.json', async (route) => {
        const snapshot = loadCmsSnapshotForE2e();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: buildE2eCmsSnapshotBody(snapshot),
        });
      });

      await mockDirectNwsRoutes(page);
      await use(new HomePage(page, baseURL ?? configuredBaseUrl));
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    },
    { auto: true },
  ],
});

export { expect };
