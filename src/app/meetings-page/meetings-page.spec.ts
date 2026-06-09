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
  linkedAgendaDocumentByEventId?: ReturnType<
    typeof signal<Record<string, { documentId: string; storageHref: string }>>
  >;
}

function configure(
  store: Pick<MeetingsPageStore, 'events' | 'isLoading'> &
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
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain(APP_COPY.en.meetingsHeading);
    expect(el.querySelector('.section-kicker')?.textContent).toContain(APP_COPY.en.meetingsKicker);
  }, 45000);

  it('renders Spanish heading and column copy', () => {
    const fixture = configure(
      { events: signal<CmsCalendarEvent[]>([]), isLoading: signal(false) },
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
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.meetings-table-skeleton')).toBeTruthy();
    expect(el.querySelector('.public-empty-state')).toBeNull();
  });

  it('renders fallback meetings table when CMS returns no events', () => {
    const fixture = configure({
      events: signal<CmsCalendarEvent[]>([]),
      isLoading: signal(false),
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
