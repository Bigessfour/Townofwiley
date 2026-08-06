import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type CmsContact, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import { ContactPage, parseRosterLine } from './contact-page';

interface RosterEntry {
  id: string;
  line: string;
}

interface ContactPageStore {
  contacts: ReturnType<typeof signal<CmsContact[]>>;
  isLoading: ReturnType<typeof signal<boolean>>;
  leadershipRosterEntriesByGroup: ReturnType<
    typeof signal<ReadonlyMap<string, readonly RosterEntry[]>>
  >;
  getSiteCopy: (key: string) => { en: string; es?: string } | undefined;
}

function rosterMapFromLines(
  entries: Iterable<[string, readonly string[]]>,
): ReadonlyMap<string, readonly RosterEntry[]> {
  const map = new Map<string, readonly RosterEntry[]>();
  for (const [groupId, lines] of entries) {
    map.set(
      groupId,
      lines.map((line, index) => ({ id: `${groupId}-${index}`, line })),
    );
  }
  return map;
}

function configure(
  store: Omit<ContactPageStore, 'leadershipRosterEntriesByGroup' | 'getSiteCopy'> &
    Partial<Pick<ContactPageStore, 'leadershipRosterEntriesByGroup' | 'getSiteCopy'>>,
  language: 'en' | 'es' = 'en',
) {
  const fullStore: ContactPageStore = {
    ...store,
    leadershipRosterEntriesByGroup:
      store.leadershipRosterEntriesByGroup ??
      signal(new Map<string, readonly RosterEntry[]>()),
    getSiteCopy: store.getSiteCopy ?? (() => undefined),
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

describe('parseRosterLine', () => {
  it('splits role and name on the first colon', () => {
    expect(parseRosterLine('Mayor: Steve McKitrick')).toEqual({
      role: 'Mayor',
      name: 'Steve McKitrick',
    });
  });
});

describe('ContactPage', () => {
  it('renders the page heading and Town Hall card (English)', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Phone, email, and next steps');
    expect(
      el.querySelector('.contact-town-hall-card .contact-section-card-title')?.textContent,
    ).toContain('Wiley Town Hall');
    expect(el.querySelector('.contact-town-hall-phone')?.getAttribute('href')).toBe(
      'tel:+17198294974',
    );
  });

  it('renders Spanish heading and Town Hall copy', () => {
    const fixture = configure(
      { contacts: signal<CmsContact[]>([]), isLoading: signal(false) },
      'es',
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Telefono, correo');
    expect(
      el.querySelector('.contact-town-hall-card .contact-section-card-title')?.textContent,
    ).toContain('Ayuntamiento de Wiley');
    expect(el.querySelector('.section-kicker')?.textContent).toContain('Contacto');
  });

  it('shows administration skeleton while CMS data is loading', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(true),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.contact-administration-skeleton[aria-busy="true"]')).toBeTruthy();
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
  });

  it('renders administration roster with separate mailto links when contacts exist', () => {
    const rosterMap = rosterMapFromLines([
      ['town-administration', ['City Clerk: Deb Dillon', 'Town Superintendent: Scott Whitman']],
    ]);
    const fixture = configure({
      contacts: signal<CmsContact[]>([
        {
          id: 'town-information',
          label: 'Town Information',
          value: '(719) 829-4974',
          detail: 'Call ahead for clerk assistance.',
          href: 'tel:+17198294974',
        },
        {
          id: 'city-clerk',
          label: 'City Clerk',
          value: 'Deb Dillon',
          detail: 'Clerk services and records coordination.',
          href: 'mailto:clerk@townofwiley.gov',
          linkLabel: 'clerk@townofwiley.gov',
        },
        {
          id: 'town-superintendent',
          label: 'Town Superintendent',
          value: 'Scott Whitman',
          detail: 'Town operations and public works.',
          href: 'mailto:clerk@townofwiley.gov',
          linkLabel: 'clerk@townofwiley.gov',
        },
      ]),
      isLoading: signal(false),
      leadershipRosterEntriesByGroup: signal(rosterMap),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.contact-administration-card .contact-roster-empty')).toBeNull();
    expect(el.querySelector('.contact-town-information-detail')?.textContent).toContain(
      'Call ahead for clerk assistance.',
    );
    const mailtoLinks = [...el.querySelectorAll('.contact-administration-card .contact-link')].map(
      (link) => link.getAttribute('href'),
    );
    expect(mailtoLinks).toEqual([
      'mailto:clerk@townofwiley.gov',
      'mailto:clerk@townofwiley.gov',
    ]);
  });

  it('exposes elected officials at #leadership and replaces roster from CMS', () => {
    const rosterMap = rosterMapFromLines([
      ['mayor-council', ['Mayor: From CMS', 'Councilman: From CMS']],
    ]);
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
      leadershipRosterEntriesByGroup: signal(rosterMap),
    });
    const el = fixture.nativeElement as HTMLElement;
    const leadership = el.querySelector('#leadership');
    expect(leadership).toBeTruthy();
    expect(leadership?.querySelector('h2')?.textContent).toContain(
      'Elected Officials (Mayor & Council)',
    );
    const electedNames = [...(leadership?.querySelectorAll('.contact-roster-name') ?? [])].map(
      (node) => node.textContent?.trim(),
    );
    expect(electedNames).toEqual(['From CMS', 'From CMS']);
  });

  it('shows roster empty state when CMS has no lines for a group', () => {
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
      leadershipRosterEntriesByGroup: signal(new Map<string, readonly RosterEntry[]>()),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.contact-roster-empty').length).toBeGreaterThan(0);
  });

  it('replaces town administration roster from CMS', () => {
    const rosterMap = rosterMapFromLines([['town-administration', ['City Clerk: From CMS']]]);
    const fixture = configure({
      contacts: signal<CmsContact[]>([]),
      isLoading: signal(false),
      leadershipRosterEntriesByGroup: signal(rosterMap),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.contact-administration-card .contact-roster-name')?.textContent).toBe(
      'From CMS',
    );
  });

  it('exposes per-record DOM ids for the See on live site deep links', () => {
    const rosterMap = new Map<string, readonly RosterEntry[]>([
      ['town-administration', [{ id: 'roster-clerk', line: 'City Clerk: Deb Dillon' }]],
      ['mayor-council', [{ id: 'roster-mayor', line: 'Mayor: Steve McKitrick' }]],
    ]);
    const fixture = configure({
      contacts: signal<CmsContact[]>([
        {
          id: 'town-information',
          label: 'Town Information',
          value: '(719) 829-4974',
          detail: 'Call ahead for clerk assistance.',
        },
        {
          id: 'city-clerk',
          label: 'City Clerk',
          value: 'Deb Dillon',
          detail: 'Clerk services and records coordination.',
          href: 'mailto:clerk@townofwiley.gov',
          linkLabel: 'clerk@townofwiley.gov',
        },
      ]),
      isLoading: signal(false),
      leadershipRosterEntriesByGroup: signal(rosterMap),
    });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#contact-administration')).toBeTruthy();
    expect(el.querySelector('#contact-town-information')).toBeTruthy();
    expect(el.querySelector('#leadership-row-town-administration-roster-clerk')).toBeTruthy();
    expect(el.querySelector('#contact-city-clerk')).toBeTruthy();
    expect(el.querySelector('#leadership-row-mayor-council-roster-mayor')).toBeTruthy();
  });
});
