import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LocalizedCmsContentStore } from './site-cms-content';

interface TestRuntimeConfig {
  cms?: {
    appSync?: {
      region?: string;
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
}

describe('LocalizedCmsContentStore', () => {
  let httpTesting: HttpTestingController;
  const runtimeWindow = window as Window & {
    __TOW_RUNTIME_CONFIG__?: TestRuntimeConfig;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: TestRuntimeConfig;
  };

  afterEach(() => {
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
    window.localStorage.removeItem('tow-site-language');
    TestBed.resetTestingModule();
  });

  it('uses bundled fallback content when runtime config is missing', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(LocalizedCmsContentStore);

    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(store.persistenceSummary()).toContain('runtime config is missing');
    expect(store.hero().title).toBe('Town of Wiley');
    expect(store.notices().length).toBeGreaterThan(0);
    expect(store.contacts()[0]?.id).toBe('town-information');

    httpTesting.verify();
  });

  it('loads and normalizes public CMS content from AppSync', async () => {
    window.localStorage.setItem('tow-site-language', 'es');
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      cms: {
        appSync: {
          region: 'us-east-2',
          apiEndpoint: 'https://cms.example.com/graphql',
          apiKey: 'test-public-api-key',
        },
      },
    };

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(LocalizedCmsContentStore);

    const cmsRequest = httpTesting.expectOne('https://cms.example.com/graphql');
    expect(cmsRequest.request.method).toBe('POST');
    expect(cmsRequest.request.headers.get('x-api-key')).toBe('test-public-api-key');
    expect(cmsRequest.request.body.query as string).toContain('listSiteSettings(limit: 1)');
    expect(cmsRequest.request.body.query as string).toContain('listAnnouncements(filter: { active: { eq: true } }, limit: 50)');
    expect(cmsRequest.request.body.query as string).toContain('listEvents(filter: { active: { eq: true } }, limit: 50)');
    expect(cmsRequest.request.body.query as string).toContain('listBusinesses(filter: { active: { eq: true } }, limit: 100)');
    expect(cmsRequest.request.body.query as string).toContain('listPublicDocuments(filter: { active: { eq: true } }, limit: 200)');
    expect(cmsRequest.request.body.query as string).toContain('listExternalNewsLinks(filter: { active: { eq: true } }, limit: 50)');

    cmsRequest.flush({
      data: {
        listSiteSettings: {
          items: [
            {
              townName: 'Town of Wiley',
              heroEyebrow: 'Town of Wiley, Colorado',
              heroStatus: 'Official Town Website',
              heroTitle: 'Town of Wiley',
              heroMessage: 'Town notices, meetings, weather, and services.',
              heroSubtext: 'Practical homepage for Wiley residents with fast access to key information.',
              welcomeLabel: 'Welcome Photo',
              welcomeHeading: 'Welcome to the Town of Wiley online home',
              welcomeBody: 'Use this homepage to reach the most important town information quickly.',
              welcomeCaption: 'Town of Wiley welcome image.',
              heroImageUrl: 'https://example.com/hero.webp',
            },
          ],
        },
        listAlertBanners: {
          items: [
            {
              id: 'disabled-banner',
              enabled: false,
              label: 'Urgent town update',
              title: 'Disabled banner should not win',
              detail: 'This banner is not active.',
              linkLabel: 'Contact Town Hall',
              linkHref: 'tel:+17198294974',
              updatedAt: '2026-04-11T12:00:00Z',
            },
            {
              id: 'active-banner',
              enabled: true,
              label: 'Urgent town update',
              title: 'Main Street closed tonight',
              detail: 'Crews will close Main Street from 8 PM until midnight for utility repairs.',
              linkLabel: 'Contact Town Hall',
              linkHref: 'tel:+17198294974',
              updatedAt: '2026-04-10T12:00:00Z',
            },
          ],
        },
        listAnnouncements: {
          items: [
            {
              id: 'retired-launch',
              title: 'Welcome to Wiley\'s New Website',
              date: '2026-03-30',
              detail: 'We developed this website in house to better offer Wiley Residents quality services.',
              priority: 0,
              active: true,
            },
            {
              id: 'water-outage',
              title: 'Water outage on Main Street',
              date: '2026-04-05',
              detail: 'Crews will repair a broken main from 10 PM until approximately 2 AM.',
              priority: 2,
              active: true,
            },
            {
              id: 'inactive-announcement',
              title: 'Inactive announcement',
              date: '2026-04-06',
              detail: 'This should be filtered out.',
              priority: 1,
              active: false,
            },
          ],
        },
        listEvents: {
          items: [
            {
              id: 'inactive-event',
              title: 'Inactive event',
              description: 'This should be filtered out.',
              location: 'Town Hall',
              start: '2026-04-04T09:00:00-06:00',
              end: '2026-04-04T10:00:00-06:00',
              active: false,
            },
            {
              id: 'may-meeting',
              title: 'May Council Meeting',
              description: 'Regular monthly council meeting.',
              location: 'Town Hall',
              start: '2026-04-20T18:00:00-06:00',
              end: '2026-04-20T20:00:00-06:00',
              active: true,
            },
            {
              id: 'april-workshop',
              title: 'April Workshop',
              description: 'Budget workshop before the next meeting.',
              location: 'Town Hall',
              start: '2026-04-12T18:00:00-06:00',
              end: '2026-04-12T19:00:00-06:00',
              active: true,
            },
          ],
        },
        listOfficialContacts: {
          items: [
            {
              id: 'clerk-desk',
              label: 'City Clerk',
              value: 'Deb Dillon',
              detail: 'Clerk services and meeting packets.',
              href: 'mailto:deb.dillon@townofwiley.gov',
              linkLabel: 'deb.dillon@townofwiley.gov',
              displayOrder: 2,
            },
            {
              id: 'town-information',
              label: 'Town Information',
              value: '(719) 829-4974',
              detail: 'Wiley Town Hall, 304 Main Street.',
              href: 'tel:+17198294974',
              displayOrder: 1,
            },
          ],
        },
        listBusinesses: {
          items: [
            {
              id: 'z-business',
              name: 'Z Business',
              phone: '719-000-0000',
              address: 'Z Street, Wiley, CO',
              website: 'https://example.com',
              description: 'Should be hidden because it is inactive.',
              imageUrl: 'https://example.com/z.webp',
              active: false,
              displayOrder: 1,
            },
            {
              id: 'a-business',
              name: 'A Business',
              phone: '719-111-1111',
              address: 'A Street, Wiley, CO',
              website: 'https://alpha.example.com',
              description: 'Alpha description',
              imageUrl: 'https://alpha.example.com/a.webp',
              active: true,
              displayOrder: 5,
            },
            {
              id: 'b-business',
              name: 'B Business',
              phone: '719-222-2222',
              address: 'B Street, Wiley, CO',
              website: 'https://beta.example.com',
              description: 'Beta description',
              imageUrl: 'https://beta.example.com/b.webp',
              active: true,
              displayOrder: 2,
            },
          ],
        },
        listPublicDocuments: {
          items: [
            {
              id: 'inactive-doc',
              title: 'Inactive doc',
              summary: 'Should be filtered out.',
              sectionId: 'records-requests',
              status: 'Draft',
              format: 'PDF',
              href: '/documents/inactive.pdf',
              downloadFileName: 'inactive.pdf',
              keywords: ['inactive'],
              active: false,
              displayOrder: 1,
            },
            {
              id: 'minutes-2026-04',
              title: 'April 2026 Minutes',
              summary: 'Approved minutes for the April meeting.',
              sectionId: 'meeting-documents',
              status: 'Approved',
              format: 'PDF',
              href: '/documents/minutes-2026-04.pdf',
              downloadFileName: null,
              keywords: ['minutes', null, 'agenda'],
              active: true,
              displayOrder: 2,
            },
            {
              id: 'agenda-2026-04',
              title: 'April 2026 Agenda Packet',
              summary: 'Agenda packet for the April meeting.',
              sectionId: 'meeting-documents',
              status: 'Published',
              format: 'PDF',
              href: '/documents/agenda-2026-04.pdf',
              downloadFileName: null,
              keywords: ['agenda', 'meeting'],
              active: true,
              displayOrder: 1,
            },
          ],
        },
        listExternalNewsLinks: {
          items: [
            {
              id: 'inactive-news',
              title: 'Inactive news',
              url: 'https://example.com/inactive',
              source: 'Example',
              active: false,
              displayOrder: 1,
            },
            {
              id: 'regional-news',
              title: 'Regional Coverage',
              url: 'https://example.com/regional',
              source: 'Regional Source',
              active: true,
              displayOrder: 3,
            },
            {
              id: 'local-news',
              title: 'Local Coverage',
              url: 'https://example.com/local',
              source: 'Local Source',
              active: true,
              displayOrder: 1,
            },
          ],
        },
      },
    });

    await Promise.resolve();

    expect(store.isLoading()).toBe(false);
    expect(store.loadError()).toBeNull();
    expect(store.persistenceSummary()).toContain('Amplify Studio');
    expect(store.hero().title).toBe('Pueblo de Wiley');
    expect(store.hero().eyebrow).toBe('Pueblo de Wiley, Colorado');
    expect(store.alertBanner().enabled).toBe(true);
    expect(store.alertBanner().title).toBe('Main Street cerrada esta noche');
    expect(store.notices().map((notice) => notice.title)).toEqual(['Corte de agua en Main Street']);
    expect(store.notices()[0]?.date).toContain('abril');
    expect(store.events().map((event) => event.title)).toEqual(['April Workshop', 'May Council Meeting']);
    expect(store.contacts().map((contact) => contact.label)).toEqual(['Informacion del pueblo', 'Secretaria municipal']);
    expect(store.businesses().map((business) => business.name)).toEqual(['B Business', 'A Business']);
    expect(store.publicDocuments().map((document) => document.title)).toEqual([
      'April 2026 Agenda Packet',
      'April 2026 Minutes',
    ]);
    expect(store.publicDocuments()[0]?.downloadFileName).toBe('');
    expect(store.publicDocuments()[1]?.keywords).toEqual(['minutes', 'agenda']);
    expect(store.externalNewsLinks().map((link) => link.title)).toEqual(['Local Coverage', 'Regional Coverage']);

    httpTesting.verify();
  });
});