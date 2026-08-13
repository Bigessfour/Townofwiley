import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { APP_COPY } from '../app';
import { DocumentUploadService } from '../document-upload.service';
import { type CmsCalendarEvent, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { MeetingsPage } from './meetings-page';

interface MeetingsPageStore {
  events: ReturnType<typeof signal<CmsCalendarEvent[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
  publicDocuments: ReturnType<typeof signal<[]>>;
  linkedAgendaDocumentByEventId?: ReturnType<
    typeof signal<Record<string, { documentId: string; storageHref: string }>>
  >;
}

function configure(
  store: Pick<MeetingsPageStore, 'events' | 'isLoading' | 'publicDocuments'> &
    Partial<Pick<MeetingsPageStore, 'linkedAgendaDocumentByEventId'>>,
  language: 'en' | 'es' = 'en',
) {
  const storeWithDefaults = {
    linkedAgendaDocumentByEventId: signal<
      Record<string, { documentId: string; storageHref: string }>
    >({}),
    ...store,
  };
  TestBed.configureTestingModule({
    imports: [MeetingsPage],
    providers: [
      SiteLanguageService,
      MessageService,
      provideHttpClient(),
      provideRouter([]),
      {
        provide: DocumentUploadService,
        useValue: {
          resolveDocumentHref: async (href: string) => href,
        } as unknown as DocumentUploadService,
      },
      {
        provide: LocalizedCmsContentStore,
        useValue: storeWithDefaults as unknown as LocalizedCmsContentStore,
      },
    ],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(MeetingsPage);
  fixture.detectChanges();
  return fixture;
}

describe('MeetingsPage', () => {
  it('renders the page heading and kicker (English)', () => {
    const fixture = configure({
      events: signal<CmsCalendarEvent[]>([]),
      isLoading: signal(false),
      publicDocuments: signal([]),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain(APP_COPY.en.meetingsHeading);
    expect(el.querySelector('.section-kicker')?.textContent).toContain(APP_COPY.en.meetingsKicker);
  }, 45000);

  it('renders Spanish heading and column copy', () => {
    const fixture = configure(
      {
        events: signal<CmsCalendarEvent[]>([]),
        isLoading: signal(false),
        publicDocuments: signal([]),
      },
      'es',
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain(APP_COPY.es.meetingsHeading);
    const headers = Array.from(el.querySelectorAll('.meetings-table th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers).toContain(APP_COPY.es.meetingsColMeeting);
  });

  it('shows skeleton state while CMS data is loading', () => {
    const fixture = configure({
      events: signal<CmsCalendarEvent[]>([]),
      isLoading: signal(true),
      publicDocuments: signal([]),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.meetings-table-skeleton')).toBeTruthy();
    expect(el.querySelector('.public-empty-state')).toBeNull();
  });

  it('leads with the next meeting and keeps later meetings in the table only', () => {
    const fixture = configure({
      events: signal<CmsCalendarEvent[]>([
        {
          id: 'next-1',
          title: 'Next council meeting',
          description: 'Agenda posts before the meeting.',
          location: 'Wiley Town Hall',
          start: '2026-09-14T18:00:00',
          end: '2026-09-14T19:00:00',
        },
        {
          id: 'later-2',
          title: 'Later work session',
          description: 'Follow-up session.',
          location: 'Wiley Town Hall',
          start: '2026-10-12T18:00:00',
          end: '2026-10-12T19:00:00',
        },
      ]),
      isLoading: signal(false),
      publicDocuments: signal([]),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#meetings-next')?.textContent).toContain('Next council meeting');
    expect(el.querySelector('#event-next-1')?.textContent).toContain('Next council meeting');
    const rowTitles = Array.from(el.querySelectorAll('.meetings-table tbody tr')).map(
      (row) => row.textContent ?? '',
    );
    expect(rowTitles).toHaveLength(1);
    expect(rowTitles[0]).toContain('Later work session');
    expect(rowTitles[0]).not.toContain('Next council meeting');
  });

  it('renders fallback meetings table when CMS returns no events', () => {
    const fixture = configure({
      events: signal<CmsCalendarEvent[]>([]),
      isLoading: signal(false),
      publicDocuments: signal([]),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.meetings-table')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain(APP_COPY.en.meetingsHeading);
  });

  it('exposes bilingual empty-state copy used by the empty branch', () => {
    expect(APP_COPY.en.meetingsEmptyState).toContain('No upcoming meetings');
    expect(APP_COPY.es.meetingsEmptyState).toContain('reuniones programadas');
  });
});
