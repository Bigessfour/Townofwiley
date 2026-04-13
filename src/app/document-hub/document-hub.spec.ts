import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  type CmsCalendarEvent,
  type CmsPublicDocument,
  LocalizedCmsContentStore,
} from '../site-cms-content';
import { DocumentRefreshService } from '../document-refresh.service';
import { DocumentUploadService } from '../document-upload.service';
import { DOCUMENT_HUB_TITLE_EN, DocumentHub } from './document-hub';

describe('DocumentHub', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-01T12:00:00-06:00').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders CMS-backed documents and the next meeting', () => {
    const events = signal<CmsCalendarEvent[]>([
      {
        id: 'future-meeting',
        title: 'April Council Meeting',
        description: 'Council meeting agenda.',
        location: 'Town Hall',
        start: '2026-04-20T18:00:00-06:00',
        end: '2026-04-20T20:00:00-06:00',
      },
    ]);
    const publicDocuments = signal<CmsPublicDocument[]>([
      {
        id: 'agenda-2026-04',
        title: 'April 2026 Agenda Packet',
        summary: 'Agenda packet for the April meeting.',
        sectionId: 'meeting-documents',
        status: 'Published',
        format: 'PDF',
        href: '/documents/agenda-2026-04.pdf',
        downloadFileName: 'agenda-2026-04.pdf',
        keywords: ['agenda', 'meeting'],
      },
    ]);

    TestBed.configureTestingModule({
      imports: [DocumentHub],
      providers: [
        provideRouter([]),
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            events,
            publicDocuments,
            refreshContent: vi.fn().mockResolvedValue(undefined),
          } as unknown as LocalizedCmsContentStore,
        },
        {
          provide: DocumentUploadService,
          useValue: {
            resolveDocumentHref: vi.fn(async (href: string) => href),
          } as unknown as DocumentUploadService,
        },
        DocumentRefreshService,
      ],
    });

    const fixture = TestBed.createComponent(DocumentHub);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="document-hub-title"]')?.textContent).toContain(
      DOCUMENT_HUB_TITLE_EN,
    );
    expect(compiled.querySelector('.featured-meeting h2')?.textContent).toContain('April Council Meeting');
    expect(Array.from(compiled.querySelectorAll('.document-file-title')).map((element) => element.textContent?.trim())).toContain(
      'April 2026 Agenda Packet',
    );
    expect(compiled.querySelector('.document-hub-button.primary')?.textContent).toContain(
      'Open records request form',
    );
  });
});