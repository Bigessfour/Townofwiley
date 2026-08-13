import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type CmsNotice, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { NoticesPage } from './notices-page';

interface NoticesPageStore {
  notices: ReturnType<typeof signal<CmsNotice[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
  getSiteCopy: (key: string) => { en: string; es?: string } | undefined;
}

function configure(
  store: Omit<NoticesPageStore, 'getSiteCopy'> & Partial<Pick<NoticesPageStore, 'getSiteCopy'>>,
  language: 'en' | 'es' = 'en',
) {
  const fullStore: NoticesPageStore = {
    ...store,
    getSiteCopy: store.getSiteCopy ?? (() => undefined),
  };
  TestBed.configureTestingModule({
    imports: [NoticesPage],
    providers: [
      SiteLanguageService,
      provideRouter([]),
      {
        provide: LocalizedCmsContentStore,
        useValue: fullStore as unknown as LocalizedCmsContentStore,
      },
    ],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(NoticesPage);
  fixture.detectChanges();
  return fixture;
}

describe('NoticesPage', () => {
  it('renders the page heading and kicker (English)', () => {
    const fixture = configure({
      notices: signal<CmsNotice[]>([]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('News & Announcements');
    expect(el.querySelector('.section-kicker')?.textContent).toContain('Latest Updates');
  });

  it('renders the page heading and kicker (Spanish)', () => {
    const fixture = configure({ notices: signal<CmsNotice[]>([]), isLoading: signal(false) }, 'es');
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Noticias y anuncios');
    expect(el.querySelector('.section-kicker')?.textContent).toContain('Novedades');
  });

  it('shows skeleton list while CMS data is loading', () => {
    const fixture = configure({
      notices: signal<CmsNotice[]>([]),
      isLoading: signal(true),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.notice-grid--skeleton')).toBeTruthy();
    expect(el.querySelector('.public-empty-state')).toBeNull();
  });

  it('renders bilingual empty state when CMS returns no notices (English)', () => {
    const fixture = configure({
      notices: signal<CmsNotice[]>([]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    const empty = el.querySelector('.public-empty-state');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('No public notices');
    expect(el.querySelector('.notice-card')).toBeNull();
  });

  it('renders bilingual empty state when CMS returns no notices (Spanish)', () => {
    const fixture = configure({ notices: signal<CmsNotice[]>([]), isLoading: signal(false) }, 'es');
    const el = fixture.nativeElement as HTMLElement;
    const empty = el.querySelector('.public-empty-state');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('No hay avisos publicos');
  });

  it('renders notice cards when data is present', () => {
    const fixture = configure({
      notices: signal<CmsNotice[]>([
        {
          id: 'n1',
          title: 'Council update',
          date: 'May 1, 2026',
          detail: 'Council meets Monday.',
          type: 'notice',
        },
      ]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.public-empty-state')).toBeNull();
    expect(el.querySelector('.notice-card-title')?.textContent).toContain('Council update');
    const link = el.querySelector('a.notice-card');
    expect(link?.getAttribute('href')).toBe('/notices#notice-n1');
  });

  it('links newsletter cards to /news', () => {
    const fixture = configure({
      notices: signal<CmsNotice[]>([
        {
          id: 'june-newsletter',
          title: 'June Newsletter',
          date: 'June 8, 2026',
          detail: 'June town newsletter',
          type: 'newsletter',
        },
      ]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.notice-card');
    expect(link?.getAttribute('href')).toBe('/news#town-newsletter-heading');
  });

  it('opens a StoryMap imageUrl in a new tab instead of rendering it as an image', () => {
    const storyUrl = 'https://storymaps.arcgis.com/stories/3e402c3303a84dcfb0d9ee6c60995349';
    const fixture = configure({
      notices: signal<CmsNotice[]>([
        {
          id: '2c607cdc-f367-4655-85b0-91b2544e74a9',
          title: '2026 SECRHA Housing Needs Assessment',
          date: 'August 1, 2026',
          detail: '2026 SECRHA Housing Needs Assessment – Interactive Story Map',
          type: 'notice',
          imageUrl: storyUrl,
        },
      ]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.notice-card');
    expect(link?.getAttribute('href')).toBe(storyUrl);
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
    expect(link?.textContent).toContain('Open interactive Story Map');
    const images = [...el.querySelectorAll('img')];
    expect(
      images.some((img) => (img.getAttribute('src') ?? '').includes('storymaps.arcgis.com')),
    ).toBe(false);
    expect(
      images.some((img) => (img.getAttribute('ng-src') ?? '').includes('storymaps.arcgis.com')),
    ).toBe(false);
  });

  it('still renders a real photo imageUrl and keeps the in-page notice link', () => {
    const photoUrl = 'https://cdn.example.com/hydrant.webp';
    const fixture = configure({
      notices: signal<CmsNotice[]>([
        {
          id: 'hydrant',
          title: 'Hydrant flushing',
          date: 'May 1, 2026',
          detail: 'Flushing this week.',
          type: 'notice',
          imageUrl: photoUrl,
        },
      ]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.notice-card');
    expect(link?.getAttribute('href')).toBe('/notices#notice-hydrant');
    expect(link?.getAttribute('target')).toBeNull();
    const img = el.querySelector('img.notice-card__image');
    expect(img).toBeTruthy();
    const src = `${img?.getAttribute('ng-src') ?? ''} ${img?.getAttribute('src') ?? ''}`;
    expect(src).toContain(photoUrl);
  });
});
