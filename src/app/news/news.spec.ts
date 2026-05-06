import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  type CmsExternalNewsLink,
  type CmsNotice,
  LocalizedCmsContentStore,
} from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { News } from './news';

describe('News', () => {
  it('renders CMS notices and news links from the shared store', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'first-notice',
        title: 'May Council Meeting',
        date: 'May 1, 2026',
        detail: 'Council meeting details.',
        type: 'notice',
      },
      {
        id: 'second-notice',
        title: 'Water notice',
        date: 'May 2, 2026',
        detail: 'Water service update.',
        type: 'notice',
      },
    ]);
    const externalNewsLinks = signal<CmsExternalNewsLink[]>([
      {
        id: 'regional-news',
        title: 'Regional Coverage',
        url: 'https://example.com/regional',
        source: 'Regional Source',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            notices,
            externalNewsLinks,
            isLoading: signal(false),
          } as unknown as LocalizedCmsContentStore,
        },
      ],
    });

    TestBed.inject(SiteLanguageService).setLanguage('en');
    const fixture = TestBed.createComponent(News);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Town News and Announcements');
    expect(compiled.querySelector('.featured-news-card h2')?.textContent).toContain(
      'May Council Meeting',
    );
    expect(compiled.querySelector('.featured-news-date')?.textContent).toContain('May 1, 2026');
    expect(compiled.querySelector('.news-card h3')?.textContent).toContain('Water notice');
    const externalCta = compiled.querySelector(
      '.news-card--external .button-cta',
    ) as HTMLAnchorElement | null;
    expect(externalCta?.getAttribute('href')).toBe('https://example.com/regional');
    expect(externalCta?.getAttribute('target')).toBe('_blank');
    expect(externalCta?.getAttribute('rel')).toContain('noopener');
    expect(externalCta?.querySelector('.visually-hidden')?.textContent).toContain(
      'opens in new tab',
    );
    const featuredLink = compiled.querySelector('.featured-news-link') as HTMLAnchorElement | null;
    expect(featuredLink?.getAttribute('href')).toBe('/notices');
  });

  it('shows the Town newsletter section when announcements use type newsletter', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-1',
        title: 'Spring newsletter',
        date: 'May 1, 2026',
        detail: 'Opening paragraph.\n\nSecond paragraph.',
        type: 'newsletter',
      },
      {
        id: 'n1',
        title: 'Hydrant flushing',
        date: 'May 3, 2026',
        detail: 'Short notice text.',
        type: 'notice',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            notices,
            externalNewsLinks: signal([]),
            isLoading: signal(false),
          } as unknown as LocalizedCmsContentStore,
        },
      ],
    });

    TestBed.inject(SiteLanguageService).setLanguage('en');
    const fixture = TestBed.createComponent(News);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#town-newsletter-heading')?.textContent).toContain(
      'Newsletter from Town Hall',
    );
    expect(el.textContent).toContain('Spring newsletter');
    expect(el.textContent).toContain('Opening paragraph.');
    expect(el.textContent).toContain('Second paragraph.');
    expect(el.querySelector('.featured-news-card h2')?.textContent).toContain('Hydrant flushing');
  });

  it('shows the newsletter-only empty bulletin message when there are no plain notices', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-only',
        title: 'Newsletter only',
        date: 'May 1, 2026',
        detail: 'Newsletter content.',
        type: 'newsletter',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            notices,
            externalNewsLinks: signal([]),
            isLoading: signal(false),
          } as unknown as LocalizedCmsContentStore,
        },
      ],
    });

    TestBed.inject(SiteLanguageService).setLanguage('en');
    const fixture = TestBed.createComponent(News);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.public-empty-state')?.textContent).toContain(
      'No separate bulletin notices',
    );
  });

  it('shows the bulletin-only empty newsletter state when no newsletter exists', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'b1',
        title: 'Sole bulletin',
        date: 'May 5, 2026',
        detail: 'Bulletin content.',
        type: 'notice',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            notices,
            externalNewsLinks: signal([]),
            isLoading: signal(false),
          } as unknown as LocalizedCmsContentStore,
        },
      ],
    });

    TestBed.inject(SiteLanguageService).setLanguage('en');
    const fixture = TestBed.createComponent(News);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#town-newsletter-heading')).toBeNull();
    expect(el.querySelector('.featured-news-card h2')?.textContent).toContain('Sole bulletin');
  });
});
