import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CmsNotice, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { NoticesPage } from './notices-page';

interface NoticesPageStore {
  notices: ReturnType<typeof signal<CmsNotice[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
}

function configure(store: NoticesPageStore, language: 'en' | 'es' = 'en') {
  TestBed.configureTestingModule({
    imports: [NoticesPage],
    providers: [
      SiteLanguageService,
      {
        provide: LocalizedCmsContentStore,
        useValue: store as unknown as LocalizedCmsContentStore,
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
    const fixture = configure(
      { notices: signal<CmsNotice[]>([]), isLoading: signal(false) },
      'es',
    );
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
    const fixture = configure(
      { notices: signal<CmsNotice[]>([]), isLoading: signal(false) },
      'es',
    );
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
  });
});
