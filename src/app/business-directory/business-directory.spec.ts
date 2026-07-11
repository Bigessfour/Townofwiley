import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defaultCmsStoreMockFields } from '../cms-test-support';
import { LoggingService } from '../logging.service';
import { type CmsBusiness, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { BusinessDirectory } from './business-directory';

interface DirectoryStore {
  businesses: ReturnType<typeof signal<CmsBusiness[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
}

function configure(store: DirectoryStore, language: 'en' | 'es' = 'en') {
  TestBed.configureTestingModule({
    imports: [BusinessDirectory],
    providers: [
      SiteLanguageService,
      {
        provide: LocalizedCmsContentStore,
        useValue: {
          ...defaultCmsStoreMockFields,
          ...store,
        } as unknown as LocalizedCmsContentStore,
      },
      {
        provide: LoggingService,
        useValue: { buttonClick: () => undefined },
      },
    ],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(BusinessDirectory);
  fixture.detectChanges();
  return fixture;
}

describe('BusinessDirectory', () => {
  it('keeps seeded businesses visible when CMS adds a new business', () => {
    const fixture = configure({
      businesses: signal<CmsBusiness[]>([
        {
          id: 'hangar-liquor-store',
          name: 'The Hangar Liquor Store',
          phone: '(719) 691-1913',
          address: '36001 US Hwy 287, Wiley, CO, United States, Colorado',
          website: 'https://www.facebook.com/p/The-Hangar-Liquor-Store-100057333045290/',
          description: 'Your Refreshment Headquarters',
          displayOrder: 1,
        },
      ]),
      isLoading: signal(false),
    });

    const titles = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.public-directory-card h2'),
    ).map((element) => element.textContent?.trim());

    expect(titles).toContain('The Hangar Liquor Store');
    expect(titles).toContain('Tempel Grain');
  });

  it('sorts CMS businesses by display order before the seeded directory entries', () => {
    const fixture = configure({
      businesses: signal<CmsBusiness[]>([
        {
          id: 'z-business',
          name: 'Z Business',
          phone: '719-000-0000',
          address: 'Z Street, Wiley, CO',
          displayOrder: 20,
        },
        {
          id: 'a-business',
          name: 'A Business',
          phone: '719-111-1111',
          address: 'A Street, Wiley, CO',
          displayOrder: 5,
        },
      ]),
      isLoading: signal(false),
    });

    const titles = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.public-directory-card h2'),
    ).map((element) => element.textContent?.trim());

    expect(titles.slice(0, 2)).toEqual(['A Business', 'Z Business']);
  });

  it('renders Spanish copy when site language is es', () => {
    const fixture = configure(
      {
        businesses: signal<CmsBusiness[]>([]),
        isLoading: signal(false),
      },
      'es',
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Directorio Comunitario');
    expect(el.querySelector('.public-page-copy')?.textContent).toContain('apoye a los negocios');
    expect(el.querySelector('.public-search-field span')?.textContent).toContain(
      'Buscar negocios locales',
    );
  });

  it('shows a loading empty-state message while CMS is loading', () => {
    const fixture = configure({
      businesses: signal<CmsBusiness[]>([]),
      isLoading: signal(true),
    });
    const el = fixture.nativeElement as HTMLElement;
    const empty = el.querySelector('.public-empty-state');
    expect(empty).toBeTruthy();
    expect(empty?.getAttribute('aria-busy')).toBe('true');
    expect(empty?.textContent).toContain('Loading the Wiley business directory');
    expect(el.querySelector('.public-directory-card')).toBeNull();
  });

  it('shows the filtered empty state with a clear-search affordance and recovers when cleared', () => {
    const fixture = configure({
      businesses: signal<CmsBusiness[]>([]),
      isLoading: signal(false),
    });
    const component = fixture.componentInstance as unknown as {
      directorySearchControl: { setValue: (value: string) => void };
    };
    component.directorySearchControl.setValue('zzzzz-no-match');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const empty = el.querySelector('.public-empty-state');
    expect(empty?.textContent).toContain('No businesses match your search');
    const clearButton = empty?.querySelector('button.text-link') as HTMLButtonElement | null;
    expect(clearButton).toBeTruthy();
    clearButton?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.public-directory-card')).toBeTruthy();
  });
});
