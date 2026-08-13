import type { AppCopy } from './app';

/** Stable SiteCopy keys clerks can edit on `/admin` (wired in the public app). */

export interface SiteCopyKeyCatalogEntry {
  key: string;
  plainLabel: string;
  appearsOn: string;
}

export const SITE_COPY_KEY_CATALOG: readonly SiteCopyKeyCatalogEntry[] = [
  { key: 'topTasksKicker', plainLabel: 'Homepage “Quick Tasks” kicker', appearsOn: '/ (How do I…)' },
  { key: 'topTasksHeading', plainLabel: 'Homepage “How do I…” heading', appearsOn: '/ (How do I…)' },
  { key: 'contactKicker', plainLabel: 'Contact page kicker', appearsOn: '/contact' },
  { key: 'contactHeading', plainLabel: 'Contact page main heading', appearsOn: '/contact' },
  {
    key: 'contactTownHallTitle',
    plainLabel: 'Town Hall card title',
    appearsOn: '/contact (Town Hall card)',
  },
  {
    key: 'contactTownHallAddress',
    plainLabel: 'Town Hall street address',
    appearsOn: '/contact (Town Hall card)',
  },
  {
    key: 'contactTownHallPhone',
    plainLabel: 'Town Hall phone (display text)',
    appearsOn: '/contact (Town Hall card)',
  },
  {
    key: 'contactTownHallHours',
    plainLabel: 'Town Hall hours line',
    appearsOn: '/contact (Town Hall card)',
  },
  { key: 'noticesKicker', plainLabel: 'Homepage notices kicker', appearsOn: '/ (notices panel)' },
  { key: 'noticesHeading', plainLabel: 'Homepage notices heading', appearsOn: '/ (notices panel)' },
  { key: 'menuQuickTasksLabel', plainLabel: 'Mega menu: I Want To…', appearsOn: 'Site header menu' },
  {
    key: 'menuGovernmentLabel',
    plainLabel: 'Mega menu: Government & Meetings',
    appearsOn: 'Site header menu',
  },
  {
    key: 'menuServicesPermitsLabel',
    plainLabel: 'Mega menu: Services',
    appearsOn: 'Site header menu',
  },
  {
    key: 'menuNewsNoticesLabel',
    plainLabel: 'Mega menu: News, Notices & Alerts',
    appearsOn: 'Site header menu',
  },
  { key: 'menuWeatherLabel', plainLabel: 'Mega menu: Weather', appearsOn: 'Site header menu' },
  {
    key: 'menuBusinessCommunityLabel',
    plainLabel: 'Mega menu: Businesses & Community',
    appearsOn: 'Site header menu',
  },
  {
    key: 'menuContactHallLabel',
    plainLabel: 'Mega menu: Contact & Town Hall',
    appearsOn: 'Site header menu',
  },
  { key: 'menuLeadershipLabel', plainLabel: 'Mega menu: Leadership', appearsOn: 'Site header menu' },
  { key: 'nav.topTasks', plainLabel: 'Nav link: Top Tasks', appearsOn: 'Header nav' },
  { key: 'nav.weather', plainLabel: 'Nav link: Weather', appearsOn: 'Header nav' },
  { key: 'nav.notices', plainLabel: 'Nav link: Notices', appearsOn: 'Header nav' },
  { key: 'nav.meetings', plainLabel: 'Nav link: Meetings', appearsOn: 'Header nav' },
  { key: 'nav.services', plainLabel: 'Nav link: Services', appearsOn: 'Header nav' },
  { key: 'nav.accessibility', plainLabel: 'Nav link: Accessibility', appearsOn: 'Header nav' },
  { key: 'nav.businesses', plainLabel: 'Nav link: Businesses', appearsOn: 'Header nav' },
  { key: 'nav.news', plainLabel: 'Nav link: News', appearsOn: 'Header nav' },
  { key: 'nav.contact', plainLabel: 'Nav link: Contact', appearsOn: 'Header nav' },
] as const;

export type SiteCopyLookup = (key: string) => { en: string; es?: string } | undefined;

export function siteCopyAppearsOn(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) {
    return null;
  }
  return SITE_COPY_KEY_CATALOG.find((entry) => entry.key === trimmed)?.appearsOn ?? null;
}

export function resolveSiteCopyLabel(
  lookup: SiteCopyLookup,
  language: string,
  key: string,
  fallback: string,
): string {
  const override = lookup(key);
  if (!override?.en?.trim()) {
    return fallback;
  }
  if (language === 'es' && override.es?.trim()) {
    return override.es.trim();
  }
  return override.en.trim();
}

/** Maps primary nav href to a stable SiteCopy key. */
export function siteCopyKeyForNavHref(href: string): string {
  if (href === '#top-tasks') {
    return 'nav.topTasks';
  }
  const path = href.split('#')[0]?.replace(/^\//, '').trim();
  return path ? `nav.${path}` : 'nav.home';
}

/** Phone display for Town Hall — digits-only tel: href from display or fallback. */
const MENU_LABEL_KEYS = [
  'menuQuickTasksLabel',
  'menuGovernmentLabel',
  'menuServicesPermitsLabel',
  'menuNewsNoticesLabel',
  'menuWeatherLabel',
  'menuBusinessCommunityLabel',
  'menuContactHallLabel',
  'menuLeadershipLabel',
  'menuQuickTasksServicesColumnLabel',
  'menuQuickTasksWeatherColumnLabel',
  'menuGovernmentMeetingsColumnLabel',
  'menuGovernmentTownColumnLabel',
  'menuServicesRelatedColumnLabel',
] as const satisfies readonly (keyof AppCopy)[];

const PAGE_HEADING_KEYS = [
  'topTasksKicker',
  'topTasksHeading',
  'contactKicker',
  'contactHeading',
  'contactTownHallTitle',
  'contactTownHallHours',
  'noticesKicker',
  'noticesHeading',
] as const satisfies readonly (keyof AppCopy)[];

const OVERRIDABLE_STRING_KEYS = [...PAGE_HEADING_KEYS, ...MENU_LABEL_KEYS] as const satisfies readonly (
  keyof AppCopy
)[];

/** Merges active SiteCopy rows into bundled APP_COPY for the current language. */
export function applyAppCopySiteCopyOverrides(
  base: AppCopy,
  lookup: SiteCopyLookup,
  language: string,
): AppCopy {
  const next: AppCopy = { ...base };

  for (const key of OVERRIDABLE_STRING_KEYS) {
    const fallback = base[key];
    if (typeof fallback === 'string') {
      (next as AppCopy)[key] = resolveSiteCopyLabel(lookup, language, key, fallback) as AppCopy[typeof key];
    }
  }

  next.navLinks = base.navLinks.map((link) => ({
    ...link,
    label: resolveSiteCopyLabel(
      lookup,
      language,
      siteCopyKeyForNavHref(link.href),
      link.label,
    ),
  }));

  return next;
}

export function siteCopyTelHref(displayPhone: string, fallbackDisplay: string): string {
  const source = displayPhone.trim() || fallbackDisplay;
  const digits = source.replace(/\D/g, '');
  if (digits.length === 10) {
    return `tel:+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `tel:+${digits}`;
  }
  return 'tel:+17198294974';
}