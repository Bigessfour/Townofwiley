import { computed } from '@angular/core';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { LocalizedCmsContentStore } from './site-cms-content';

export function matchCmsSnapshotRequests(httpTesting: HttpTestingController): TestRequest[] {
  return httpTesting.match((request) => request.url.includes('/cms-snapshot.json'));
}

export function flushBuildCmsSnapshotNotFound(httpTesting: HttpTestingController): void {
  for (const request of matchCmsSnapshotRequests(httpTesting)) {
    request.flush(null, { status: 404, statusText: 'Not Found' });
  }
}

export async function waitForCmsStoreInitialization(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

export async function flushCmsSnapshotAndWait(httpTesting: HttpTestingController): Promise<void> {
  flushBuildCmsSnapshotNotFound(httpTesting);
  await waitForCmsStoreInitialization();
}

export const defaultCmsStoreMockFields = {
  extendedLoadFailed: computed(() => false),
  isExtendedLoading: computed(() => false),
} satisfies Partial<LocalizedCmsContentStore>;

export const emptyCmsExtendedGraphqlData = {
  listBusinesses: { items: [] },
  listPublicDocuments: { items: [] },
  listExternalNewsLinks: { items: [] },
  listLeadershipRosterEntries: { items: [] },
};

export const emptyCmsCoreGraphqlData = {
  listSiteSettings: { items: [] },
  listAlertBanners: { items: [] },
  listAnnouncements: { items: [] },
  listEvents: { items: [] },
  listOfficialContacts: { items: [] },
};
