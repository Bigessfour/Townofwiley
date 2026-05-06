import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DocumentUploadService } from '../document-upload.service';
import {
  type CmsExternalNewsLink,
  type CmsNotice,
  LocalizedCmsContentStore,
} from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { News } from './news';

const RESOLVED_NEWSLETTER_URL = 'https://example.com/resolved-newsletter.pdf';

function createDocumentUploadStub(overrides: Partial<DocumentUploadService> = {}) {
  return {
    resolveDocumentHref: (href: string) =>
      href.startsWith('http') ? Promise.resolve(href) : Promise.resolve(RESOLVED_NEWSLETTER_URL),
    getStorageKeyFromHref: () => null,
    ...overrides,
  } as unknown as DocumentUploadService;
}

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

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
        { provide: DocumentUploadService, useValue: createDocumentUploadStub() },
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

  it('falls back to paragraph rendering when the latest newsletter has no attachmentKey', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-1',
        title: 'Spring newsletter',
        date: 'May 1, 2026',
        rawDate: '2026-05-01',
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
        { provide: DocumentUploadService, useValue: createDocumentUploadStub() },
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
    expect(el.querySelector('iframe.newsletter-pdf-frame')).toBeNull();
    expect(el.querySelector('[data-testid=newsletter-download-link]')).toBeNull();
    expect(el.querySelector('.featured-news-card h2')?.textContent).toContain('Hydrant flushing');
  });

  it('renders only the latest active newsletter when multiple exist (sorted by rawDate desc)', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-old',
        title: 'April newsletter',
        date: 'April 1, 2026',
        rawDate: '2026-04-01',
        detail: 'Older issue.',
        type: 'newsletter',
      },
      {
        id: 'nl-new',
        title: 'May newsletter',
        date: 'May 6, 2026',
        rawDate: '2026-05-06',
        detail: 'Latest issue.',
        type: 'newsletter',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        { provide: DocumentUploadService, useValue: createDocumentUploadStub() },
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
    const newsletterCards = el.querySelectorAll('.newsletter-item-card');
    expect(newsletterCards.length).toBe(1);
    const headerText = newsletterCards[0]?.querySelector('h3')?.textContent ?? '';
    expect(headerText).toContain('May newsletter');
    expect(el.textContent).not.toContain('April newsletter');
  });

  it('resolves attachmentKey via DocumentUploadService and exposes presigned URL signals', async () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-pdf',
        title: 'May newsletter',
        date: 'May 6, 2026',
        rawDate: '2026-05-06',
        detail: 'Summary copy.',
        type: 'newsletter',
        attachmentKey: 'documents/newsletter/2026-05-06-town-newsletter.pdf',
      },
    ]);

    const resolveDocumentHref = vi.fn(async (href: string) =>
      href.startsWith('http') ? href : RESOLVED_NEWSLETTER_URL,
    );

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        {
          provide: DocumentUploadService,
          useValue: createDocumentUploadStub({ resolveDocumentHref }),
        },
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
    await fixture.whenStable();
    await flushAsync();
    fixture.detectChanges();

    expect(resolveDocumentHref).toHaveBeenCalledWith(
      'documents/newsletter/2026-05-06-town-newsletter.pdf',
    );
    const component = fixture.componentInstance as unknown as {
      resolvedNewsletterHref: () => string | null;
      trustedNewsletterUrl: () => unknown;
      newsletterHrefError: () => boolean;
    };
    expect(component.resolvedNewsletterHref()).toBe(RESOLVED_NEWSLETTER_URL);
    expect(component.trustedNewsletterUrl()).not.toBeNull();
    expect(component.newsletterHrefError()).toBe(false);
  });

  it('clears resolved newsletter signals and surfaces an error on resolution failure', async () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-pdf',
        title: 'May newsletter',
        date: 'May 6, 2026',
        rawDate: '2026-05-06',
        detail: 'Summary copy.',
        type: 'newsletter',
        attachmentKey: 'documents/newsletter/missing.pdf',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        {
          provide: DocumentUploadService,
          useValue: createDocumentUploadStub({
            resolveDocumentHref: () => Promise.reject(new Error('boom')),
          }),
        },
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

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.inject(SiteLanguageService).setLanguage('en');
    const fixture = TestBed.createComponent(News);
    fixture.detectChanges();
    await fixture.whenStable();
    await flushAsync();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      resolvedNewsletterHref: () => string | null;
      newsletterHrefError: () => boolean;
    };
    expect(component.resolvedNewsletterHref()).toBeNull();
    expect(component.newsletterHrefError()).toBe(true);
    consoleErrorSpy.mockRestore();
  });

  it('shows the newsletter-only empty bulletin message when there are no plain notices', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'nl-only',
        title: 'Newsletter only',
        date: 'May 1, 2026',
        rawDate: '2026-05-01',
        detail: 'Newsletter content.',
        type: 'newsletter',
      },
    ]);

    TestBed.configureTestingModule({
      imports: [News],
      providers: [
        SiteLanguageService,
        provideRouter([]),
        { provide: DocumentUploadService, useValue: createDocumentUploadStub() },
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
        { provide: DocumentUploadService, useValue: createDocumentUploadStub() },
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
