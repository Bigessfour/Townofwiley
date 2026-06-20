import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { computed } from '@angular/core';
import { LocalizedCmsContentStore } from './site-cms-content';

export function matchCmsSnapshotRequests(httpTesting: HttpTestingController): TestRequest[] {
  return httpTesting.match((request) => request.url.includes('/cms-snapshot.json'));
}

export function flushBuildCmsSnapshotNotFound(httpTesting: HttpTestingController): void {
  for (const request of matchCmsSnapshotRequests(httpTesting)) {
    request.flush(null, { status: 404, statusText: 'Not Found' });
  }
}

export function matchCmsRevisionRequests(httpTesting: HttpTestingController): TestRequest[] {
  return httpTesting.match((request) => request.url.includes('/cms-revision.json'));
}

export function flushBuildCmsRevisionNotFound(httpTesting: HttpTestingController): void {
  for (const request of matchCmsRevisionRequests(httpTesting)) {
    request.flush(null, { status: 404, statusText: 'Not Found' });
  }
}

export async function waitForCmsStoreInitialization(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export async function flushCmsSnapshotAndWait(httpTesting: HttpTestingController): Promise<void> {
  // `LocalizedCmsContentStore.initializeContentLoad()` chains:
  //   GET /cms-snapshot.json → microtasks → GET /cms-revision.json (and possibly a 2nd snapshot
  //   if revision returned a value). Loop until no in-flight CMS CDN requests remain so callers
  //   don't have to know the exact microtask count.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    flushBuildCmsSnapshotNotFound(httpTesting);
    flushBuildCmsRevisionNotFound(httpTesting);
    await Promise.resolve();
  }
  await waitForCmsStoreInitialization();
}

export const defaultCmsStoreMockFields = {
  extendedLoadFailed: computed(() => false),
  isExtendedLoading: computed(() => false),
  linkedAgendaDocumentByEventId: computed(() => ({})),
  agendaHubHrefByEventId: computed(() => ({})),
} satisfies Partial<LocalizedCmsContentStore>;

export const emptyCmsExtendedGraphqlData = {
  listBusinesses: { items: [] },
  listPublicDocuments: { items: [] },
  listExternalNewsLinks: { items: [] },
  listLeadershipRosterEntries: { items: [] },
  listSiteCopies: { items: [] },
};

export const emptyCmsCoreGraphqlData = {
  listSiteSettings: { items: [] },
  listAlertBanners: { items: [] },
  listAnnouncements: { items: [] },
  listEvents: { items: [] },
  listOfficialContacts: { items: [] },
};
