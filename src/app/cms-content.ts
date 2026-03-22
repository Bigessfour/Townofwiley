import { Injectable, computed, signal } from '@angular/core';

export interface CmsNotice {
  id: string;
  title: string;
  date: string;
  detail: string;
}

export interface CmsHeroContent {
  eyebrow: string;
  status: string;
  title: string;
  message: string;
  subtext: string;
  welcomeLabel: string;
  welcomeHeading: string;
  welcomeBody: string;
  welcomeCaption: string;
}

export interface CmsAlertBanner {
  enabled: boolean;
  label: string;
  title: string;
  detail: string;
  linkLabel: string;
  linkHref: string;
}

export interface CmsContact {
  id: string;
  label: string;
  value: string;
  detail: string;
  href?: string;
  linkLabel?: string;
}

export interface CmsPortalContent {
  hero: CmsHeroContent;
  alertBanner: CmsAlertBanner;
  notices: CmsNotice[];
  contacts: CmsContact[];
}

export const TOW_CMS_STORAGE_KEY = 'tow-cms-content-v1';

export const DEFAULT_CMS_HERO: CmsHeroContent = {
  eyebrow: 'Municipal Website Scaffold',
  status: 'Official Website In Development',
  title: 'Town of Wiley',
  message:
    'A resident-first homepage scaffold for Wiley, Colorado, built around accessibility, clear top tasks, public transparency, and the everyday services a small plains town needs first.',
  subtext:
    'For a town of about 437 residents in eastern Colorado, the homepage should stay practical: fast notices, visible contact details, meeting access, utility help, and weather-sensitive service updates.',
  welcomeLabel: 'Main Welcome Image',
  welcomeHeading: 'The homepage now opens with the Wiley hero image instead of only scaffold copy',
  welcomeBody:
    'This banner places a recognizable local visual at the top of the page while the rest of the homepage continues to organize notices, meetings, services, and contact details around resident tasks.',
  welcomeCaption: 'Current draft hero image for the Town of Wiley welcome page.',
};

export const DEFAULT_CMS_ALERT_BANNER: CmsAlertBanner = {
  enabled: false,
  label: 'Town Alert',
  title: 'Urgent town update',
  detail: 'Use this banner for emergency changes, closures, or critical public information.',
  linkLabel: 'Contact Town Hall',
  linkHref: 'tel:+17198294974',
};

export const DEFAULT_CMS_NOTICES: CmsNotice[] = [
  {
    id: 'homepage-rebuild',
    title: 'Homepage rebuild focused on Wiley essentials',
    date: 'March 2026',
    detail:
      'The new design is being scoped around small-town essentials: payments, meetings, service issues, office contacts, and clear emergency or weather-sensitive notices.',
  },
  {
    id: 'digital-self-service-rollout',
    title: 'Digital self-service rollout planned in phases',
    date: 'Spring 2026',
    detail:
      'Payments, service requests, permits, meeting archives, and records access are being organized around resident tasks instead of department structure.',
  },
  {
    id: 'notice-placement',
    title: 'Public notice placement reserved for high-visibility alerts',
    date: 'Operational',
    detail:
      'Emergency information, special meeting notices, utility interruptions, and weather-related updates should remain visible without forcing residents to search.',
  },
];

export const DEFAULT_CMS_CONTACTS: CmsContact[] = [
  {
    id: 'town-information',
    label: 'Town Information',
    value: '(719) 829-4974',
    detail:
      'Wiley Town Hall, 304 Main Street. Call ahead if you would like time on the City Council agenda or need clerk assistance.',
    href: 'tel:+17198294974',
  },
  {
    id: 'mayor',
    label: 'Mayor',
    value: 'Stephen McKitrick',
    detail:
      'Official mayoral correspondence can be sent to this alias and routed through the town email workflow.',
    href: 'mailto:stephen.mckitrick@townofwiley.gov',
    linkLabel: 'stephen.mckitrick@townofwiley.gov',
  },
  {
    id: 'city-clerk',
    label: 'City Clerk',
    value: 'Deb Dillon',
    detail: 'Clerk services, meeting packets, records coordination, and agenda planning support.',
    href: 'mailto:deb.dillon@townofwiley.gov',
    linkLabel: 'deb.dillon@townofwiley.gov',
  },
  {
    id: 'town-superintendent',
    label: 'Town Superintendent',
    value: 'Scott Whitman',
    detail: 'Town operations, public works coordination, and service follow-up.',
    href: 'mailto:scott.whitman@townofwiley.gov',
    linkLabel: 'scott.whitman@townofwiley.gov',
  },
];

interface StoredCmsContent {
  hero: CmsHeroContent;
  alertBanner: CmsAlertBanner;
  notices: CmsNotice[];
  contacts: CmsContact[];
}

export function cloneCmsNotice(notice: CmsNotice): CmsNotice {
  return { ...notice };
}

export function cloneCmsNotices(notices: CmsNotice[]): CmsNotice[] {
  return notices.map((notice) => cloneCmsNotice(notice));
}

export function cloneCmsHeroContent(content: CmsHeroContent): CmsHeroContent {
  return { ...content };
}

export function cloneCmsAlertBanner(content: CmsAlertBanner): CmsAlertBanner {
  return { ...content };
}

export function cloneCmsContact(contact: CmsContact): CmsContact {
  return { ...contact };
}

export function cloneCmsContacts(contacts: CmsContact[]): CmsContact[] {
  return contacts.map((contact) => cloneCmsContact(contact));
}

export function createCmsNoticeId(): string {
  return `notice-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createCmsContactId(): string {
  return `contact-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

@Injectable({
  providedIn: 'root',
})
export class CmsContentStore {
  private readonly heroState = signal<CmsHeroContent>(cloneCmsHeroContent(DEFAULT_CMS_HERO));
  private readonly alertBannerState = signal<CmsAlertBanner>(
    cloneCmsAlertBanner(DEFAULT_CMS_ALERT_BANNER),
  );
  private readonly noticesState = signal<CmsNotice[]>(cloneCmsNotices(DEFAULT_CMS_NOTICES));
  private readonly contactsState = signal<CmsContact[]>(cloneCmsContacts(DEFAULT_CMS_CONTACTS));
  private readonly persistenceModeState = signal<'seed' | 'local'>('seed');

  readonly hero = computed(() => this.heroState());
  readonly alertBanner = computed(() => this.alertBannerState());
  readonly notices = computed(() => this.noticesState());
  readonly contacts = computed(() => this.contactsState());
  readonly persistenceSummary = computed(() =>
    this.persistenceModeState() === 'local'
      ? 'Saved in this browser. Clerk edits stay live on this device until the shared AWS content API is wired.'
      : 'Showing the starter homepage content bundled with the site. Save from the clerk editor to replace it in this browser.',
  );

  constructor() {
    this.hydrate();
  }

  getDraftContent(): CmsPortalContent {
    return {
      hero: cloneCmsHeroContent(this.heroState()),
      alertBanner: cloneCmsAlertBanner(this.alertBannerState()),
      notices: cloneCmsNotices(this.noticesState()),
      contacts: cloneCmsContacts(this.contactsState()),
    };
  }

  async saveContent(content: CmsPortalContent): Promise<void> {
    this.heroState.set(this.normalizeHero(content.hero));
    this.alertBannerState.set(this.normalizeAlertBanner(content.alertBanner));
    this.noticesState.set(this.normalizeNotices(content.notices));
    this.contactsState.set(this.normalizeContacts(content.contacts));
    this.persistenceModeState.set('local');
    this.writeToStorage(this.createSnapshot());
  }

  resetToDefaults(): void {
    this.heroState.set(cloneCmsHeroContent(DEFAULT_CMS_HERO));
    this.alertBannerState.set(cloneCmsAlertBanner(DEFAULT_CMS_ALERT_BANNER));
    this.noticesState.set(cloneCmsNotices(DEFAULT_CMS_NOTICES));
    this.contactsState.set(cloneCmsContacts(DEFAULT_CMS_CONTACTS));
    this.persistenceModeState.set('seed');

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(TOW_CMS_STORAGE_KEY);
  }

  private hydrate(): void {
    const stored = this.readFromStorage();

    if (!stored) {
      return;
    }

    this.heroState.set(cloneCmsHeroContent(stored.hero));
    this.alertBannerState.set(cloneCmsAlertBanner(stored.alertBanner));
    this.noticesState.set(cloneCmsNotices(stored.notices));
    this.contactsState.set(cloneCmsContacts(stored.contacts));
    this.persistenceModeState.set('local');
  }

  private readFromStorage(): StoredCmsContent | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const rawValue = window.localStorage.getItem(TOW_CMS_STORAGE_KEY);

      if (!rawValue) {
        return null;
      }

      const parsedValue = JSON.parse(rawValue) as Partial<StoredCmsContent>;

      return {
        hero: this.normalizeHero(parsedValue.hero),
        alertBanner: this.normalizeAlertBanner(parsedValue.alertBanner),
        notices: this.normalizeNotices(parsedValue.notices),
        contacts: this.normalizeContacts(parsedValue.contacts),
      };
    } catch {
      return null;
    }
  }

  private createSnapshot(): StoredCmsContent {
    return {
      hero: cloneCmsHeroContent(this.heroState()),
      alertBanner: cloneCmsAlertBanner(this.alertBannerState()),
      notices: cloneCmsNotices(this.noticesState()),
      contacts: cloneCmsContacts(this.contactsState()),
    };
  }

  private normalizeHero(hero: Partial<CmsHeroContent> | undefined): CmsHeroContent {
    return {
      eyebrow:
        typeof hero?.eyebrow === 'string' && hero.eyebrow.trim()
          ? hero.eyebrow.trim()
          : DEFAULT_CMS_HERO.eyebrow,
      status:
        typeof hero?.status === 'string' && hero.status.trim()
          ? hero.status.trim()
          : DEFAULT_CMS_HERO.status,
      title:
        typeof hero?.title === 'string' && hero.title.trim()
          ? hero.title.trim()
          : DEFAULT_CMS_HERO.title,
      message:
        typeof hero?.message === 'string' && hero.message.trim()
          ? hero.message.trim()
          : DEFAULT_CMS_HERO.message,
      subtext:
        typeof hero?.subtext === 'string' && hero.subtext.trim()
          ? hero.subtext.trim()
          : DEFAULT_CMS_HERO.subtext,
      welcomeLabel:
        typeof hero?.welcomeLabel === 'string' && hero.welcomeLabel.trim()
          ? hero.welcomeLabel.trim()
          : DEFAULT_CMS_HERO.welcomeLabel,
      welcomeHeading:
        typeof hero?.welcomeHeading === 'string' && hero.welcomeHeading.trim()
          ? hero.welcomeHeading.trim()
          : DEFAULT_CMS_HERO.welcomeHeading,
      welcomeBody:
        typeof hero?.welcomeBody === 'string' && hero.welcomeBody.trim()
          ? hero.welcomeBody.trim()
          : DEFAULT_CMS_HERO.welcomeBody,
      welcomeCaption:
        typeof hero?.welcomeCaption === 'string' && hero.welcomeCaption.trim()
          ? hero.welcomeCaption.trim()
          : DEFAULT_CMS_HERO.welcomeCaption,
    };
  }

  private normalizeAlertBanner(alertBanner: Partial<CmsAlertBanner> | undefined): CmsAlertBanner {
    return {
      enabled: Boolean(alertBanner?.enabled),
      label:
        typeof alertBanner?.label === 'string' && alertBanner.label.trim()
          ? alertBanner.label.trim()
          : DEFAULT_CMS_ALERT_BANNER.label,
      title:
        typeof alertBanner?.title === 'string' && alertBanner.title.trim()
          ? alertBanner.title.trim()
          : DEFAULT_CMS_ALERT_BANNER.title,
      detail:
        typeof alertBanner?.detail === 'string' && alertBanner.detail.trim()
          ? alertBanner.detail.trim()
          : DEFAULT_CMS_ALERT_BANNER.detail,
      linkLabel: typeof alertBanner?.linkLabel === 'string' ? alertBanner.linkLabel.trim() : '',
      linkHref: typeof alertBanner?.linkHref === 'string' ? alertBanner.linkHref.trim() : '',
    };
  }

  private normalizeNotices(notices: CmsNotice[] | undefined): CmsNotice[] {
    const normalizedNotices = Array.isArray(notices)
      ? notices
          .map((notice) => ({
            id: notice?.id?.trim() || createCmsNoticeId(),
            title: typeof notice?.title === 'string' ? notice.title.trim() : '',
            date: typeof notice?.date === 'string' ? notice.date.trim() : '',
            detail: typeof notice?.detail === 'string' ? notice.detail.trim() : '',
          }))
          .filter((notice) => notice.title && notice.date && notice.detail)
      : [];

    return normalizedNotices.length ? normalizedNotices : cloneCmsNotices(DEFAULT_CMS_NOTICES);
  }

  private normalizeContacts(contacts: CmsContact[] | undefined): CmsContact[] {
    const normalizedContacts = Array.isArray(contacts)
      ? contacts
          .map((contact) => ({
            id: contact?.id?.trim() || createCmsContactId(),
            label: typeof contact?.label === 'string' ? contact.label.trim() : '',
            value: typeof contact?.value === 'string' ? contact.value.trim() : '',
            detail: typeof contact?.detail === 'string' ? contact.detail.trim() : '',
            href: typeof contact?.href === 'string' ? contact.href.trim() : '',
            linkLabel: typeof contact?.linkLabel === 'string' ? contact.linkLabel.trim() : '',
          }))
          .filter((contact) => contact.label && contact.value && contact.detail)
      : [];

    return normalizedContacts.length ? normalizedContacts : cloneCmsContacts(DEFAULT_CMS_CONTACTS);
  }

  private writeToStorage(content: StoredCmsContent): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(TOW_CMS_STORAGE_KEY, JSON.stringify(content));
  }
}
