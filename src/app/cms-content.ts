import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

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

export const DEFAULT_CMS_HERO: CmsHeroContent = {
  eyebrow: 'Town of Wiley, Colorado',
  status: 'Official Town Website',
  title: 'Town of Wiley',
  message:
    'Find town notices, meeting details, weather updates, and essential resident services in one place.',
  subtext:
    'For a town of about 437 residents in eastern Colorado, the homepage should stay practical: fast notices, visible contact details, meeting access, utility help, and weather-sensitive service updates.',
  welcomeLabel: 'Main Welcome Image',
  welcomeHeading: 'Welcome to the Town of Wiley online home',
  welcomeBody:
    'Use this homepage to reach the most important town information quickly, including meetings, notices, contact paths, and weather-sensitive updates.',
  welcomeCaption: 'Town of Wiley welcome image.',
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
    title: 'Town services and notices are available here',
    date: 'March 2026',
    detail:
      'Residents can use the website to find meetings, service information, office contacts, weather alerts, and public notices without navigating through multiple departments.',
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

interface RuntimeCmsConfig {
  region: string;
  apiEndpoint: string;
  apiKey: string;
}

interface CmsGraphqlList<T> {
  items?: Array<T | null> | null;
}

interface SiteSettingsRecord {
  townName: string;
  pageTitle?: string | null;
  heroEyebrow?: string | null;
  heroStatus?: string | null;
  heroTitle?: string | null;
  heroMessage?: string | null;
  heroSubtext?: string | null;
  welcomeLabel?: string | null;
  welcomeHeading?: string | null;
  welcomeBody?: string | null;
  welcomeCaption?: string | null;
}

interface AlertBannerRecord {
  id: string;
  enabled: boolean;
  label: string;
  title: string;
  detail: string;
  linkLabel?: string | null;
  linkHref?: string | null;
  updatedAt?: string | null;
}

interface AnnouncementRecord {
  id: string;
  title: string;
  date?: string | null;
  detail: string;
  priority?: number | null;
  active: boolean;
}

interface OfficialContactRecord {
  id: string;
  label: string;
  value: string;
  detail: string;
  href?: string | null;
  linkLabel?: string | null;
  displayOrder?: number | null;
}

interface CmsGraphqlResponse {
  data?: {
    listSiteSettings?: CmsGraphqlList<SiteSettingsRecord>;
    listAlertBanners?: CmsGraphqlList<AlertBannerRecord>;
    listAnnouncements?: CmsGraphqlList<AnnouncementRecord>;
    listOfficialContacts?: CmsGraphqlList<OfficialContactRecord>;
  };
  errors?: Array<{
    message?: string;
  }>;
}

const PUBLIC_CMS_QUERY = `query GetPublicCmsContent {
  listSiteSettings(limit: 1) {
    items {
      townName
      pageTitle
      heroEyebrow
      heroStatus
      heroTitle
      heroMessage
      heroSubtext
      welcomeLabel
      welcomeHeading
      welcomeBody
      welcomeCaption
    }
  }
  listAlertBanners(limit: 20) {
    items {
      id
      enabled
      label
      title
      detail
      linkLabel
      linkHref
      updatedAt
    }
  }
  listAnnouncements(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      title
      date
      detail
      priority
      active
    }
  }
  listOfficialContacts(limit: 50) {
    items {
      id
      label
      value
      detail
      href
      linkLabel
      displayOrder
    }
  }
}`;

@Injectable({
  providedIn: 'root',
})
export class CmsContentStore {
  private readonly http = inject(HttpClient);
  private readonly cmsConfig = this.getCmsRuntimeConfig();
  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  private readonly heroState = signal<CmsHeroContent>({ ...DEFAULT_CMS_HERO });
  private readonly alertBannerState = signal<CmsAlertBanner>({ ...DEFAULT_CMS_ALERT_BANNER });
  private readonly noticesState = signal<CmsNotice[]>(DEFAULT_CMS_NOTICES.map((notice) => ({ ...notice })));
  private readonly contactsState = signal<CmsContact[]>(
    DEFAULT_CMS_CONTACTS.map((contact) => ({ ...contact })),
  );
  private readonly loadState = signal<'fallback' | 'loading' | 'studio' | 'error'>(
    this.cmsConfig.apiEndpoint && this.cmsConfig.apiKey ? 'loading' : 'fallback',
  );
  private readonly loadErrorState = signal<string | null>(null);

  readonly hero = computed(() => this.heroState());
  readonly alertBanner = computed(() => this.alertBannerState());
  readonly notices = computed(() => this.noticesState());
  readonly contacts = computed(() => this.contactsState());
  readonly isLoading = computed(() => this.loadState() === 'loading');
  readonly loadError = computed(() => this.loadErrorState());
  readonly persistenceSummary = computed(() => {
    if (!this.cmsConfig.apiEndpoint || !this.cmsConfig.apiKey) {
      return 'Amplify Studio CMS runtime config is missing. The site is showing bundled fallback content until AppSync settings are injected at build or deploy time.';
    }

    switch (this.loadState()) {
      case 'loading':
        return 'Loading homepage content from Amplify Studio.';
      case 'studio':
        return 'Homepage content is coming from Amplify Studio through AppSync. Browser-based CMS editing is disabled.';
      case 'error':
        return 'Amplify Studio content could not be loaded. The site fell back to bundled homepage content.';
      default:
        return 'Showing bundled fallback homepage content.';
    }
  });

  constructor() {
    if (this.cmsConfig.apiEndpoint && this.cmsConfig.apiKey) {
      void this.loadContent();
    }
  }

  private async loadContent(): Promise<void> {
    this.loadState.set('loading');
    this.loadErrorState.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<CmsGraphqlResponse>(
          this.cmsConfig.apiEndpoint,
          {
            query: PUBLIC_CMS_QUERY,
          },
          {
            headers: {
              'content-type': 'application/json',
              'x-api-key': this.cmsConfig.apiKey,
            },
          },
        ),
      );

      if (response.errors?.length) {
        throw new Error(
          response.errors
            .map((error) => error.message?.trim())
            .filter((message): message is string => Boolean(message))
            .join(' '),
        );
      }

      const content = this.mapPortalContent(response.data);
      this.heroState.set(content.hero);
      this.alertBannerState.set(content.alertBanner);
      this.noticesState.set(content.notices);
      this.contactsState.set(content.contacts);
      this.loadState.set('studio');
    } catch (error) {
      this.applyFallbackContent();
      this.loadState.set('error');
      this.loadErrorState.set(this.readLoadError(error));
    }
  }

  private mapPortalContent(data: CmsGraphqlResponse['data']): CmsPortalContent {
    const siteSettings = data?.listSiteSettings?.items?.find(
      (item): item is SiteSettingsRecord => Boolean(item),
    );
    const alertBanner = this.pickAlertBanner(data?.listAlertBanners?.items ?? []);

    return {
      hero: this.normalizeHero(siteSettings),
      alertBanner: this.normalizeAlertBanner(alertBanner),
      notices: this.normalizeAnnouncements(data?.listAnnouncements?.items ?? []),
      contacts: this.normalizeContacts(data?.listOfficialContacts?.items ?? []),
    };
  }

  private applyFallbackContent(): void {
    this.heroState.set({ ...DEFAULT_CMS_HERO });
    this.alertBannerState.set({ ...DEFAULT_CMS_ALERT_BANNER });
    this.noticesState.set(DEFAULT_CMS_NOTICES.map((notice) => ({ ...notice })));
    this.contactsState.set(DEFAULT_CMS_CONTACTS.map((contact) => ({ ...contact })));
  }

  private normalizeHero(siteSettings: SiteSettingsRecord | undefined): CmsHeroContent {
    return {
      eyebrow: this.pickText(siteSettings?.heroEyebrow, DEFAULT_CMS_HERO.eyebrow),
      status: this.pickText(siteSettings?.heroStatus, DEFAULT_CMS_HERO.status),
      title: this.pickText(
        siteSettings?.heroTitle ?? siteSettings?.pageTitle ?? siteSettings?.townName,
        DEFAULT_CMS_HERO.title,
      ),
      message: this.pickText(siteSettings?.heroMessage, DEFAULT_CMS_HERO.message),
      subtext: this.pickText(siteSettings?.heroSubtext, DEFAULT_CMS_HERO.subtext),
      welcomeLabel: this.pickText(siteSettings?.welcomeLabel, DEFAULT_CMS_HERO.welcomeLabel),
      welcomeHeading: this.pickText(
        siteSettings?.welcomeHeading,
        DEFAULT_CMS_HERO.welcomeHeading,
      ),
      welcomeBody: this.pickText(siteSettings?.welcomeBody, DEFAULT_CMS_HERO.welcomeBody),
      welcomeCaption: this.pickText(
        siteSettings?.welcomeCaption,
        DEFAULT_CMS_HERO.welcomeCaption,
      ),
    };
  }

  private normalizeAlertBanner(alertBanner: AlertBannerRecord | undefined): CmsAlertBanner {
    return {
      enabled: Boolean(alertBanner?.enabled),
      label: this.pickText(alertBanner?.label, DEFAULT_CMS_ALERT_BANNER.label),
      title: this.pickText(alertBanner?.title, DEFAULT_CMS_ALERT_BANNER.title),
      detail: this.pickText(alertBanner?.detail, DEFAULT_CMS_ALERT_BANNER.detail),
      linkLabel: this.cleanText(alertBanner?.linkLabel) ?? '',
      linkHref: this.cleanText(alertBanner?.linkHref) ?? '',
    };
  }

  private normalizeAnnouncements(records: Array<AnnouncementRecord | null>): CmsNotice[] {
    const notices = records
      .filter((record): record is AnnouncementRecord => Boolean(record?.active))
      .map((record) => ({
        id: record.id.trim(),
        title: this.cleanText(record.title) ?? '',
        date: this.formatDateLabel(record.date),
        detail: this.cleanText(record.detail) ?? '',
        priority: typeof record.priority === 'number' ? record.priority : Number.MAX_SAFE_INTEGER,
      }))
      .filter((notice) => notice.id && notice.title && notice.detail)
      .sort((left, right) => left.priority - right.priority)
      .map(({ priority: _priority, ...notice }) => notice);

    return notices.length ? notices : DEFAULT_CMS_NOTICES.map((notice) => ({ ...notice }));
  }

  private normalizeContacts(records: Array<OfficialContactRecord | null>): CmsContact[] {
    const contacts = records
      .filter((record): record is OfficialContactRecord => Boolean(record))
      .map((record) => ({
        id: record.id.trim(),
        label: this.cleanText(record.label) ?? '',
        value: this.cleanText(record.value) ?? '',
        detail: this.cleanText(record.detail) ?? '',
        href: this.cleanText(record.href),
        linkLabel: this.cleanText(record.linkLabel),
        displayOrder:
          typeof record.displayOrder === 'number' ? record.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .filter((contact) => contact.id && contact.label && contact.value && contact.detail)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map(({ displayOrder: _displayOrder, ...contact }) => contact);

    return contacts.length ? contacts : DEFAULT_CMS_CONTACTS.map((contact) => ({ ...contact }));
  }

  private pickAlertBanner(records: Array<AlertBannerRecord | null>): AlertBannerRecord | undefined {
    return records
      .filter((record): record is AlertBannerRecord => Boolean(record))
      .sort((left, right) => {
        if (left.enabled !== right.enabled) {
          return left.enabled ? -1 : 1;
        }

        return (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '');
      })[0];
  }

  private formatDateLabel(value: string | null | undefined): string {
    const trimmedValue = this.cleanText(value);

    if (!trimmedValue) {
      return 'Town update';
    }

    const parsedDate = new Date(trimmedValue);

    return Number.isNaN(parsedDate.getTime())
      ? trimmedValue
      : this.dateFormatter.format(parsedDate);
  }

  private pickText(value: string | null | undefined, fallback: string): string {
    return this.cleanText(value) ?? fallback;
  }

  private cleanText(value: string | null | undefined): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return 'Unable to load Amplify Studio content right now.';
  }

  private getCmsRuntimeConfig(): RuntimeCmsConfig {
    const runtimeWindow =
      typeof window === 'undefined'
        ? undefined
        : (window as Window & {
            __TOW_RUNTIME_CONFIG__?: {
              cms?: {
                appSync?: {
                  region?: string;
                  apiEndpoint?: string;
                  apiKey?: string;
                };
              };
            };
            __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
              cms?: {
                appSync?: {
                  region?: string;
                  apiEndpoint?: string;
                  apiKey?: string;
                };
              };
            };
          });
    const appSyncConfig = {
      ...(runtimeWindow?.__TOW_RUNTIME_CONFIG__?.cms?.appSync ?? {}),
      ...(runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms?.appSync ?? {}),
    };

    return {
      region: typeof appSyncConfig.region === 'string' ? appSyncConfig.region : '',
      apiEndpoint: typeof appSyncConfig.apiEndpoint === 'string' ? appSyncConfig.apiEndpoint : '',
      apiKey: typeof appSyncConfig.apiKey === 'string' ? appSyncConfig.apiKey : '',
    };
  }
}
