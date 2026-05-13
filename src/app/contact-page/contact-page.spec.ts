import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CmsContact, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { ContactPage } from './contact-page';

interface ContactPageStore {
  contacts: ReturnType<typeof signal<CmsContact[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
  leadershipRosterLinesByGroup: ReturnType<
    typeof signal<ReadonlyMap<string, readonly string[]>>
  >;
}

function configure(
  store: Omit<ContactPageStore, 'leadershipRosterLinesByGroup'> &
    Partial<Pick<ContactPageStore, 'leadershipRosterLinesByGroup'>>,
  language: 'en' | 'es' = 'en',
) {
  const fullStore: ContactPageStore = {
    leadershipRosterLinesByGroup: signal(new Map<string, readonly string[]>()),
    ...store,
  };
  TestBed.configureTestingModule({
    imports: [ContactPage],
    providers: [
      SiteLanguageService,
      {
        provide: LocalizedCmsContentStore,
        useValue: fullStore as unknown as LocalizedCmsContentStore,
      },
    ],
  });
  TestBed.inject(SiteLanguageService).setLanguage(language);
  const fixture = TestBed.createComponent(ContactPage);
  fixture.detectChanges();
  return fixture;
}

describe('ContactPage', () => {
  it('renders the page heading and Town Hall info (English)', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Phone, email, and next steps');
    expect(el.querySelector('.contact-town-hall-name')?.textContent).toContain('Wiley Town Hall');
    expect(el.querySelector('.contact-town-hall-phone')?.getAttribute('href')).toBe(
      'tel:+17198294974',
    );
  });

  it('renders Spanish heading copy', () => {
    const fixture = configure(
      { contacts: signal<CmsContact[]>([]), isLoading: signal(false) },
      'es',
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Telefono, correo');
    expect(el.querySelector('.section-kicker')?.textContent).toContain('Contacto');
  });

  it('shows skeleton cards while CMS data is loading', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(true),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.contact-grid[aria-busy="true"]')).toBeTruthy();
    expect(el.querySelector('.public-empty-state')).toBeNull();
  });

  it('renders bilingual empty state when no contacts return (English)', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    const empty = el.querySelector('.public-empty-state');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('Town Hall directory');
    expect(el.querySelector('.contact-card-label')).toBeNull();
  });

  it('renders bilingual empty state when no contacts return (Spanish)', () => {
    const fixture = configure(
      { contacts: signal<CmsContact[]>([]), isLoading: signal(false) },
      'es',
    );
    const el = fixture.nativeElement as HTMLElement;
    const empty = el.querySelector('.public-empty-state');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('directorio del Ayuntamiento');
  });

  it('renders contact cards when data is present', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([
        {
          id: 'town-hall',
          label: 'Town Hall',
          value: '(719) 829-4974',
          detail: 'Open Monday-Friday',
        },
      ]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.public-empty-state')).toBeNull();
    expect(el.querySelector('.contact-card-label')?.textContent).toContain('Town Hall');
  });

  it('replaces Mayor and Council roster bullets from CMS when rows exist', () => {
    const rosterMap = new Map<string, readonly string[]>([
      ['mayor-council', ['Mayor: From CMS', 'Councilman: From CMS']],
    ]);
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
      leadershipRosterLinesByGroup: signal(rosterMap),
    });
    const el = fixture.nativeElement as HTMLElement;
    const mayorList = el.querySelector('.leadership-card .leadership-list');
    expect(
      [...(mayorList?.querySelectorAll('li') ?? [])].map((li) => li.textContent?.trim()),
    ).toEqual(['Mayor: From CMS', 'Councilman: From CMS']);
  });
});
