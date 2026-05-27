import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { defaultCmsStoreMockFields } from '../cms-test-support';
import {
  type CmsCalendarEvent,
  type CmsPublicDocument,
  LocalizedCmsContentStore,
} from '../site-cms-content';
import { type SiteLanguage, SiteLanguageService } from '../site-language';
import { DocumentRefreshService } from '../document-refresh.service';
import { DocumentUploadService } from '../document-upload.service';
import { DOCUMENT_HUB_TITLE_EN, DOCUMENT_HUB_TITLE_ES, DocumentHub } from './document-hub';

function languageMock(language: SiteLanguage): SiteLanguageService {
  return {
    currentLanguage: () => language,
    isSpanish: () => language === 'es',
    setLanguage: vi.fn(),
    toggleLanguage: vi.fn(),
  } as unknown as SiteLanguageService;
}

interface ConfigureOpts {
  events?: CmsCalendarEvent[];
  publicDocuments?: CmsPublicDocument[];
  language?: SiteLanguage;
  resolveDocumentHref?: (href: string) => Promise<string>;
}

async function configure(opts: ConfigureOpts = {}) {
  const events = signal<CmsCalendarEvent[]>(opts.events ?? []);
  const publicDocuments = signal<CmsPublicDocument[]>(opts.publicDocuments ?? []);

  TestBed.configureTestingModule({
    imports: [DocumentHub],
    providers: [
      provideRouter([]),
      {
        provide: LocalizedCmsContentStore,
        useValue: {
          ...defaultCmsStoreMockFields,
          events,
          publicDocuments,
          refreshContent: vi.fn().mockResolvedValue(undefined),
        } as unknown as LocalizedCmsContentStore,
      },
      {
        provide: DocumentUploadService,
        useValue: {
          resolveDocumentHref: vi.fn(opts.resolveDocumentHref ?? (async (href: string) => href)),
        } as unknown as DocumentUploadService,
      },
      {
        provide: SiteLanguageService,
        useFactory: () => languageMock(opts.language ?? 'en'),
      },
      DocumentRefreshService,
    ],
  });

  const fixture = TestBed.createComponent(DocumentHub);
  fixture.detectChanges();
  // Wait for resolveCmsDocumentHrefs() promise chain (success or rejection) to settle.
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('DocumentHub', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-01T12:00:00-06:00').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders CMS-backed documents and the next meeting (English)', async () => {
    const fixture = await configure({
      events: [
        {
          id: 'future-meeting',
          title: 'April Council Meeting',
          description: 'Council meeting agenda.',
          location: 'Town Hall',
          start: '2026-04-20T18:00:00-06:00',
          end: '2026-04-20T20:00:00-06:00',
        },
      ],
      publicDocuments: [
        {
          id: 'agenda-2026-04',
          title: 'Council Meeting Agenda Packet',
          summary: 'Agenda packet for the April meeting.',
          sectionId: 'meeting-documents',
          status: 'Published',
          format: 'PDF',
          href: '/documents/agenda-2026-04.pdf',
          downloadFileName: 'agenda-2026-04.pdf',
          keywords: ['agenda', 'meeting'],
        },
      ],
    });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="document-hub-title"]')?.textContent).toContain(
      DOCUMENT_HUB_TITLE_EN,
    );
    expect(compiled.querySelector('.featured-meeting h2')?.textContent).toContain(
      'April Council Meeting',
    );
    expect(
      Array.from(compiled.querySelectorAll('.document-file-title')).map((el) =>
        el.textContent?.trim(),
      ),
    ).toContain('Council Meeting Agenda Packet');
    expect(compiled.querySelector('.document-hub-button.primary')?.textContent).toContain(
      'Open records request form',
    );
    expect(compiled.querySelector('.featured-meeting .document-hub-kicker')?.textContent).toContain(
      'Upcoming',
    );
    expect(compiled.querySelector('.archive-header h3')?.textContent).toContain(
      'Search previous agendas',
    );
    expect(compiled.querySelector('[data-testid="document-hub-resolution-error"]')).toBeNull();
  });

  it('renders Spanish copy when site language is es', async () => {
    const fixture = await configure({ language: 'es' });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="document-hub-title"]')?.textContent).toContain(
      DOCUMENT_HUB_TITLE_ES,
    );
    expect(el.querySelector('.featured-meeting .document-hub-kicker')?.textContent).toContain(
      'Proximamente',
    );
    expect(el.querySelector('.archive-header h3')?.textContent).toContain('Buscar agendas');
  });

  it('shows a bilingual error state when document href resolution fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fixture = await configure({
      publicDocuments: [
        {
          id: 'broken-doc',
          title: 'Broken Doc',
          summary: 'Will fail to resolve.',
          sectionId: 'records-requests',
          status: 'Published',
          format: 'PDF',
          href: 's3://bucket/broken.pdf',
          downloadFileName: 'broken.pdf',
          keywords: [],
        },
      ],
      resolveDocumentHref: () => Promise.reject(new Error('boom')),
    });
    const el = fixture.nativeElement as HTMLElement;
    const banner = el.querySelector('[data-testid="document-hub-resolution-error"]');
    expect(banner).toBeTruthy();
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(banner?.textContent).toContain('document links could not be loaded');
  });
});
