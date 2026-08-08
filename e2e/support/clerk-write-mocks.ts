import type { Page, Route } from '@playwright/test';

/** Staff GraphQL + media-upload mocks for clerk write-path e2e (Wave 2). */

export async function installClerkWriteMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
        e2e?: { staffAuth?: boolean };
        cms?: { mediaUpload?: { apiEndpoint?: string } };
      };
      __TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__?: {
        cms?: { mediaUpload?: { apiEndpoint?: string } };
      };
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
      e2e: {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.e2e ?? {}),
        staffAuth: true,
      },
      cms: {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms ?? {}),
        mediaUpload: { apiEndpoint: '/mock-media-upload' },
      },
    };
    runtimeWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__ = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__ ?? {}),
      cms: {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_ADMIN_OVERRIDE__?.cms ?? {}),
        mediaUpload: { apiEndpoint: '/mock-media-upload' },
      },
    };
  });

  await page.route('**/cms-snapshot.json', async (route) => {
    const response = await route.fetch();
    const snapshot = (await response.json()) as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...snapshot,
        eventRecords: [
          {
            id: 'e2e-meeting-1',
            title: 'E2E Town Council',
            description: null,
            location: 'Town Hall',
            start: '2026-09-01T18:00:00.000Z',
            end: '2026-09-01T20:00:00.000Z',
            active: true,
          },
        ],
      }),
    });
  });

  await page.route(/\/mock-media-upload\/presign$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        storageKey: 'documents/meeting-documents/e2e-agenda.pdf',
        uploadUrl: '/mock-media-upload/put',
        publicUrl: 'https://townofwiley.gov/documents/meeting-documents/e2e-agenda.pdf',
      }),
    });
  });

  await page.route(/\/mock-media-upload\/put$/, async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  await page.route(/\/mock-media-upload\/complete$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        storageKey: 'documents/meeting-documents/e2e-agenda.pdf',
        id: 'documents/meeting-documents/e2e-agenda.pdf',
        publicUrl: 'https://townofwiley.gov/documents/meeting-documents/e2e-agenda.pdf',
      }),
    });
  });

  await page.route(/appsync-api\..*\/graphql|\/graphql$/, async (route: Route) => {
    const raw = route.request().postData() ?? '';
    let query = raw;
    try {
      const parsed = JSON.parse(raw) as { query?: string };
      query = parsed.query ?? raw;
    } catch {
      /* Amplify may send plain query string */
    }

    if (/CreateAnnouncement/i.test(query)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { createAnnouncement: { id: 'e2e-notice-1' } } }),
      });
      return;
    }

    if (/CreatePublicDocument/i.test(query)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { createPublicDocument: { id: 'e2e-doc-1' } } }),
      });
      return;
    }

    // List / sync queries used by forceLiveRefresh
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          listAnnouncements: { items: [] },
          listEvents: { items: [] },
          listPublicDocuments: { items: [] },
          listSiteSettings: { items: [] },
        },
      }),
    });
  });
}
