import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CmsExternalNewsLink, type CmsNotice, LocalizedCmsContentStore } from '../site-cms-content';
import { News } from './news';

describe('News', () => {
  it('renders CMS notices and news links from the shared store', () => {
    const notices = signal<CmsNotice[]>([
      {
        id: 'first-notice',
        title: 'May Council Meeting',
        date: 'May 1, 2026',
        detail: 'Council meeting details.',
      },
      {
        id: 'second-notice',
        title: 'Water notice',
        date: 'May 2, 2026',
        detail: 'Water service update.',
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
        {
          provide: LocalizedCmsContentStore,
          useValue: {
            notices,
            externalNewsLinks,
          } as unknown as LocalizedCmsContentStore,
        },
      ],
    });

    const fixture = TestBed.createComponent(News);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Town News and Announcements');
    expect(compiled.querySelector('.featured-news-card h2')?.textContent).toContain('May Council Meeting');
    expect(compiled.querySelector('.featured-news-date')?.textContent).toContain('May 1, 2026');
    expect(compiled.querySelector('.news-card h3')?.textContent).toContain('Water notice');
    expect(compiled.querySelector('.news-card--external .button-cta')?.getAttribute('href')).toBe(
      'https://example.com/regional',
    );
  });
});