import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, retry, throwError, timeout, timer } from 'rxjs';
import { CmsPreviewModeService } from './cms-admin/cms-preview-mode.service';
import { isNoticeDateStillVisible } from './cms-notice-visibility';
import { LEADERSHIP_ROSTER_GROUP_IDS } from './leadership-roster-group-ids';
import { LoggingService } from './logging.service';
import {
  buildAgendaHubHrefByEventId,
  buildLinkedAgendaDocumentByEventId,
} from './public-document-event-link';
import { SiteLanguage, SiteLanguageService } from './site-language';

export interface CmsNotice {
  id: string;
  title: string;
  date: string;
  /** Sortable ISO/AWSDate string from the source record; useful when `date` is a localized label. */
  rawDate?: string;
  detail: string;
  body?: string; // multi-paragraph newsletter content, newline-separated
  type?: 'notice' | 'newsletter';
  imageUrl?: string;
  /**
   * Optional Amplify storage key (e.g. `documents/newsletter/<file>.pdf`) for newsletter PDFs.
   * Resolved to a presigned URL by the consuming component via DocumentUploadService.
   */
  attachmentKey?: string;
}

export interface CmsHeroContent {
  eyebrow: string;
  status: string;
  title: string;
  message: string;
  subtext: string;
  heroImageUrl?: string;
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

export interface CmsCalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string | null;
}

export interface CmsBusiness {
  id: string;
  name: string;
  phone: string;
  address: string;
  website?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface CmsPublicDocument {
  id: string;
  title: string;
  titleEs?: string;
  summary: string;
  summaryEs?: string;
  sectionId: string;
  status: string;
  statusEs?: string;
  format: string;
  href: string;
  downloadFileName: string;
  keywords: string[];
}

export interface CmsExternalNewsLink {
  id: string;
  title: string;
  url: string;
  source: string;
}

const DEFAULT_CMS_HERO: CmsHeroContent = {
  eyebrow: 'Town of Wiley, Colorado',
  status: 'Official Town Website',
  title: 'Town of Wiley',
  message: 'Town notices, meetings, weather, and services.',
  subtext: 'Services, meetings, and Town Hall contacts for Wiley residents.',
  welcomeLabel: '',
  welcomeHeading: 'Welcome to the Town of Wiley online home',
  welcomeBody: '',
  welcomeCaption: '',
};

const DEFAULT_CMS_HERO_ES: CmsHeroContent = {
  eyebrow: 'Pueblo de Wiley, Colorado',
  status: 'Sitio web oficial del pueblo',
  title: 'Pueblo de Wiley',
  message: 'Avisos, reuniones, clima y servicios del pueblo.',
  subtext: 'Servicios, reuniones y contactos del Ayuntamiento para residentes de Wiley.',
  welcomeLabel: '',
  welcomeHeading: 'Bienvenidos al sitio en linea del Pueblo de Wiley',
  welcomeBody: '',
  welcomeCaption: '',
};

const DEFAULT_CMS_ALERT_BANNER: CmsAlertBanner = {
  enabled: false,
  label: 'Town Alert',
  title: 'Urgent town update',
  detail:
    'Important town alerts and service updates will appear here when published by town staff.',
  linkLabel: 'Contact Town Hall',
  linkHref: 'tel:+17198294974',
};

const DEFAULT_CMS_ALERT_BANNER_ES: CmsAlertBanner = {
  enabled: false,
  label: 'Alerta del pueblo',
  title: 'Actualizacion urgente del pueblo',
  detail:
    'Los avisos importantes del pueblo y actualizaciones de servicios aparecerán aquí cuando el personal los publique.',
  linkLabel: 'Contactar al ayuntamiento',
  linkHref: 'tel:+17198294974',
};

const DEFAULT_CMS_NOTICES: CmsNotice[] = [
  {
    id: 'welcome-website',
    title: 'Welcome to the Town of Wiley Official Website',
    date: 'Recent',
    detail:
      'Find town services, meetings, weather updates, and public notices. Call Town Hall at (719) 829-4974 for help.',
  },
  {
    id: 'upcoming-meeting',
    title: 'Town Council Meeting Scheduled',
    date: 'See calendar',
    detail:
      'Town Council meets on the second Monday of each month at 6:00 PM at Wiley Town Hall, 304 Main Street. Agendas post before each meeting.',
  },
  {
    id: 'weather-alerts',
    title: 'Severe Weather Alert Sign-Up Available',
    date: 'Ongoing',
    detail:
      'Sign up for local weather and emergency alerts on the Weather page. You can choose email or text.',
  },
];

const DEFAULT_CMS_NOTICES_ES: CmsNotice[] = [
  {
    id: 'welcome-website',
    title: 'Bienvenido al Sitio Web Oficial del Pueblo de Wiley',
    date: 'Reciente',
    detail:
      'Encuentre servicios del pueblo, reuniones, clima y avisos públicos. Llame al Ayuntamiento al (719) 829-4974 para ayuda.',
  },
  {
    id: 'upcoming-meeting',
    title: 'Reunión del Consejo Municipal Programada',
    date: 'Ver calendario',
    detail:
      'El Concejo municipal se reúne el segundo lunes de cada mes a las 6:00 PM en el Ayuntamiento de Wiley, 304 Main Street. Las agendas se publican antes de cada reunión.',
  },
  {
    id: 'weather-alerts',
    title: 'Registro Disponible para Alertas de Clima Severo',
    date: 'Continuo',
    detail:
      'Regístrese para alertas locales de clima y emergencias en la página del Clima. Puede elegir correo o mensaje de texto.',
  },
];

const DEFAULT_CMS_CONTACTS: CmsContact[] = [
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
    detail: 'Contact the Mayor by email for official town business or council-related questions.',
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

const DEFAULT_CMS_CONTACTS_ES: CmsContact[] = [
  {
    id: 'town-information',
    label: 'Informacion del pueblo',
    value: '(719) 829-4974',
    detail:
      'Ayuntamiento de Wiley, 304 Main Street. Llame con anticipacion si desea tiempo en la agenda del concejo municipal o necesita ayuda del secretario.',
    href: 'tel:+17198294974',
  },
  {
    id: 'mayor',
    label: 'Alcalde',
    value: 'Stephen McKitrick',
    detail:
      'Comuniquese con el alcalde por correo electronico para asuntos oficiales del pueblo o preguntas del concejo.',
    href: 'mailto:stephen.mckitrick@townofwiley.gov',
    linkLabel: 'stephen.mckitrick@townofwiley.gov',
  },
  {
    id: 'city-clerk',
    label: 'Secretaria municipal',
    value: 'Deb Dillon',
    detail:
      'Servicios de secretaria, paquetes de reuniones, coordinacion de registros y apoyo para planeacion de agendas.',
    href: 'mailto:deb.dillon@townofwiley.gov',
    linkLabel: 'deb.dillon@townofwiley.gov',
  },
  {
    id: 'town-superintendent',
    label: 'Superintendente del pueblo',
    value: 'Scott Whitman',
    detail: 'Operaciones del pueblo, coordinacion de obras publicas y seguimiento de servicios.',
    href: 'mailto:scott.whitman@townofwiley.gov',
    linkLabel: 'scott.whitman@townofwiley.gov',
  },
];

const DEFAULT_NOTICE_MAP = {
  en: new Map(DEFAULT_CMS_NOTICES.map((notice) => [notice.id, notice])),
  es: new Map(DEFAULT_CMS_NOTICES_ES.map((notice) => [notice.id, notice])),
};

const DEFAULT_CONTACT_MAP = {
  en: new Map(DEFAULT_CMS_CONTACTS.map((contact) => [contact.id, contact])),
  es: new Map(DEFAULT_CMS_CONTACTS_ES.map((contact) => [contact.id, contact])),
};

const RETIRED_LAUNCH_NOTICE_TITLES = new Set([
  'welcometowileysnewwebsite',
  'bienvenidosalnuevositiowebdewiley',
]);

const RETIRED_LAUNCH_NOTICE_DETAILS = new Set([
  'wedevelopedthiswebsiteinhousetobetterofferwileyresidentsqualityservices',
  'desarrollamosestesitiowebinternamenteparaofreceralosresidentesdewileyserviciosdecalidad',
]);

const KNOWN_CMS_TEXT_TRANSLATIONS: Record<string, string> = {
  'Town of Wiley, Colorado': 'Pueblo de Wiley, Colorado',
  'Official Town Website': 'Sitio web oficial del pueblo',
  'Town of Wiley': 'Pueblo de Wiley',
  'Find town notices, meeting details, weather updates, and essential resident services in one place.':
    'Encuentre avisos del pueblo, detalles de reuniones, actualizaciones del clima y servicios esenciales para residentes en un solo lugar.',
  'For a town of about 437 residents in eastern Colorado, the homepage should stay practical: fast notices, visible contact details, meeting access, utility help, and weather-sensitive service updates.':
    'Para un pueblo de alrededor de 437 residentes en el este de Colorado, la pagina principal debe seguir siendo practica: avisos rapidos, contactos visibles, acceso a reuniones, ayuda con servicios y actualizaciones sensibles al clima.',
  'Main Welcome Image': 'Imagen principal de bienvenida',
  'Welcome to the Town of Wiley online home': 'Bienvenidos al sitio en linea del Pueblo de Wiley',
  'Use this homepage to reach the most important town information quickly, including meetings, notices, contact paths, and weather-sensitive updates.':
    'Use esta pagina principal para llegar rapidamente a la informacion mas importante del pueblo, incluidas reuniones, avisos, rutas de contacto y actualizaciones sensibles al clima.',
  'Town of Wiley welcome image.': 'Imagen de bienvenida del Pueblo de Wiley.',
  'Services, meetings, and Town Hall contacts for Wiley residents.':
    'Servicios, reuniones y contactos del Ayuntamiento para residentes de Wiley.',
  'Town Alert': 'Alerta del pueblo',
  'Urgent town update': 'Actualizacion urgente del pueblo',
  'Use this banner for emergency changes, closures, or critical public information.':
    'Use este banner para emergencias, cierres o informacion publica critica.',
  'Important town alerts and service updates will appear here when published by town staff.':
    'Los avisos importantes del pueblo y actualizaciones de servicios aparecerán aquí cuando el personal los publique.',
  'Contact Town Hall': 'Contactar al ayuntamiento',
  'Town services and notices are available here':
    'Los servicios y avisos del pueblo estan disponibles aqui',
  'March 2026': 'Marzo de 2026',
  'Residents can use the website to find meetings, service information, office contacts, weather alerts, and public notices without navigating through multiple departments.':
    'Los residentes pueden usar el sitio web para encontrar reuniones, informacion de servicios, contactos de oficina, alertas del clima y avisos publicos sin navegar por varios departamentos.',
  'Digital self-service rollout planned in phases':
    'El lanzamiento del autoservicio digital esta planeado por fases',
  'Spring 2026': 'Primavera de 2026',
  'Payments, service requests, meeting archives, and records access are being organized around resident tasks instead of department structure.':
    'Los pagos, solicitudes de servicio, archivos de reuniones y acceso a registros se estan organizando alrededor de tareas de residentes y no por estructura departamental.',
  'Public notice placement reserved for high-visibility alerts':
    'El espacio para avisos publicos se reserva para alertas de alta visibilidad',
  Operational: 'Operacion',
  'Emergency information, special meeting notices, utility interruptions, and weather-related updates should remain visible without forcing residents to search.':
    'La informacion de emergencia, avisos de reuniones especiales, interrupciones de servicios y actualizaciones relacionadas con el clima deben seguir visibles sin obligar a los residentes a buscar.',
  'Town Information': 'Informacion del pueblo',
  'Wiley Town Hall, 304 Main Street. Call ahead if you would like time on the City Council agenda or need clerk assistance.':
    'Ayuntamiento de Wiley, 304 Main Street. Llame con anticipacion si desea tiempo en la agenda del concejo municipal o necesita ayuda del secretario.',
  Mayor: 'Alcalde',
  'Contact the Mayor by email for official town business or council-related questions.':
    'Comuniquese con el alcalde por correo electronico para asuntos oficiales del pueblo o preguntas del concejo.',
  'City Clerk': 'Secretaria municipal',
  'Clerk services, meeting packets, records coordination, and agenda planning support.':
    'Servicios de secretaria, paquetes de reuniones, coordinacion de registros y apoyo para planeacion de agendas.',
  'Town Superintendent': 'Superintendente del pueblo',
  'Town operations, public works coordination, and service follow-up.':
    'Operaciones del pueblo, coordinacion de obras publicas y seguimiento de servicios.',
  'Town Website': 'Sitio del pueblo',
  'Open for Residents': 'Abierto para residentes',
  'Wiley Community Updates': 'Actualizaciones comunitarias de Wiley',
  'Find the latest notices, meeting updates, and town information in one place.':
    'Encuentre los avisos mas recientes, actualizaciones de reuniones e informacion del pueblo en un solo lugar.',
  'This version highlights emergency notices and resident-facing updates first.':
    'Esta version destaca primero los avisos de emergencia y las actualizaciones para residentes.',
  'Welcome Photo': 'Foto de bienvenida',
  'A fresh homepage for Wiley residents': 'Una pagina principal renovada para residentes de Wiley',
  'The welcome area now explains what residents can do on the site right away.':
    'El area de bienvenida ahora explica de inmediato lo que los residentes pueden hacer en el sitio.',
  'Updated caption for the Wiley homepage photo.':
    'Pie de foto actualizado para la imagen principal de Wiley.',
  'Emergency Notice': 'Aviso de emergencia',
  'Main Street closed tonight': 'Main Street cerrada esta noche',
  'Crews will close Main Street from 8 PM until midnight for utility repairs.':
    'Las cuadrillas cerraran Main Street desde las 8 PM hasta la medianoche por reparaciones de servicios.',
  'Call Town Hall': 'Llamar al ayuntamiento',
  'Water outage on Main Street': 'Corte de agua en Main Street',
  'Crews will repair a broken main from 10 PM until approximately 2 AM.':
    'Las cuadrillas repararan una linea principal rota desde las 10 PM hasta aproximadamente las 2 AM.',
  'Clerk Desk': 'Oficina de secretaria',
  'Call or email for meeting packets and town records requests.':
    'Llame o escriba para paquetes de reuniones y solicitudes de registros del pueblo.',
};

interface RuntimeCmsConfig {
  region: string;
  apiEndpoint: string;
  apiKey: string;
}

export interface CmsConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  checkedAt: string;
  recordCount: number;
  sampleTownName?: string;
  error?: string;
}

interface CmsGraphqlList<T> {
  items?: (T | null)[] | null;
}

interface SiteSettingsRecord {
  townName: string;
  pageTitle?: string | null;
  heroEyebrow?: string | null;
  heroStatus?: string | null;
  heroTitle?: string | null;
  heroMessage?: string | null;
  heroSubtext?: string | null;
  heroImageUrl?: string | null;
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
  announcementKind?: string | null;
  attachmentKey?: string | null;
  priority?: number | null;
  imageUrl?: string | null;
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

interface LeadershipRosterEntryRecord {
  id: string;
  groupId: string;
  displayOrder?: number | null;
  lineEn?: string | null;
  lineEs?: string | null;
  active: boolean;
}

interface EventRecord {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start: string;
  end?: string | null;
  active: boolean;
}

interface BusinessRecord {
  id: string;
  name: string;
  phone: string;
  address: string;
  website?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  active: boolean;
  displayOrder?: number | null;
}

interface PublicDocumentRecord {
  id: string;
  title: string;
  titleEs?: string | null;
  summary: string;
  summaryEs?: string | null;
  sectionId: string;
  status: string;
  statusEs?: string | null;
  format: string;
  href: string;
  downloadFileName?: string | null;
  keywords?: (string | null)[] | null;
  active: boolean;
  displayOrder?: number | null;
}

interface ExternalNewsLinkRecord {
  id: string;
  title: string;
  url: string;
  source: string;
  active: boolean;
  displayOrder?: number | null;
}

interface SiteCopyRecord {
  id: string;
  key: string;
  valueEn: string;
  valueEs?: string | null;
  description?: string | null;
  active: boolean;
  displayOrder?: number | null;
}

interface CmsGraphqlResponse {
  data?: {
    listSiteSettings?: CmsGraphqlList<SiteSettingsRecord>;
    listAlertBanners?: CmsGraphqlList<AlertBannerRecord>;
    listAnnouncements?: CmsGraphqlList<AnnouncementRecord>;
    getAnnouncement?: AnnouncementRecord | null;
    listEvents?: CmsGraphqlList<EventRecord>;
    listOfficialContacts?: CmsGraphqlList<OfficialContactRecord>;
    listBusinesses?: CmsGraphqlList<BusinessRecord>;
    listPublicDocuments?: CmsGraphqlList<PublicDocumentRecord>;
    listExternalNewsLinks?: CmsGraphqlList<ExternalNewsLinkRecord>;
    listLeadershipRosterEntries?: CmsGraphqlList<LeadershipRosterEntryRecord>;
    listSiteCopies?: CmsGraphqlList<SiteCopyRecord>;
  };
  errors?: {
    message?: string;
  }[];
}

/**
 * CMS coverage (Amplify Studio / AppSync): town hero + welcome block (`listSiteSettings`),
 * alert banners, announcements/notices, calendar events, official contacts, leadership roster
 * lines for /contact, businesses, public documents, external news links. Split into core
 * (homepage-critical) and extended (directory/docs/roster) queries so a slow AppSync response
 * does not block the entire homepage load.
 */
const PUBLIC_CMS_CORE_QUERY = `query GetPublicCmsCoreContent {
  listSiteSettings(limit: 1) {
    items {
      townName
      pageTitle
      heroEyebrow
      heroStatus
      heroTitle
      heroMessage
      heroSubtext
      heroImageUrl
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
  listAnnouncements(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items {
      id
      title
      date
      detail
      announcementKind
      attachmentKey
      priority
      imageUrl
      active
    }
  }
  listEvents(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items {
      id
      title
      description
      location
      start
      end
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

const PUBLIC_CMS_EXTENDED_QUERY = `query GetPublicCmsExtendedContent {
  listBusinesses(filter: { active: { eq: true } }, limit: 100) {
    items {
      id
      name
      phone
      address
      website
      description
      imageUrl
      active
      displayOrder
    }
  }
  listPublicDocuments(filter: { active: { eq: true } }, limit: 100) {
    items {
      id
      title
      titleEs
      summary
      summaryEs
      sectionId
      status
      statusEs
      format
      href
      downloadFileName
      keywords
      active
      displayOrder
    }
  }
  listExternalNewsLinks(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items {
      id
      title
      url
      source
      active
      displayOrder
    }
  }
  listLeadershipRosterEntries(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      groupId
      displayOrder
      lineEn
      lineEs
      active
    }
  }
  listSiteCopies(filter: { active: { eq: true } }, limit: 200) {
    items {
      id
      key
      valueEn
      valueEs
      description
      active
      displayOrder
    }
  }
}`;

const PUBLIC_CMS_PREVIEW_CORE_QUERY = `query GetPublicCmsPreviewCoreContent {
  listSiteSettings(limit: 1) {
    items {
      townName
      pageTitle
      heroEyebrow
      heroStatus
      heroTitle
      heroMessage
      heroSubtext
      heroImageUrl
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
  listAnnouncements(limit: 50) {
    items {
      id
      title
      date
      detail
      announcementKind
      attachmentKey
      priority
      imageUrl
      active
    }
  }
  listEvents(limit: 50) {
    items {
      id
      title
      description
      location
      start
      end
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

const PUBLIC_CMS_PREVIEW_EXTENDED_QUERY = `query GetPublicCmsPreviewExtendedContent {
  listBusinesses(limit: 100) {
    items {
      id
      name
      phone
      address
      website
      description
      imageUrl
      active
      displayOrder
    }
  }
  listPublicDocuments(limit: 100) {
    items {
      id
      title
      titleEs
      summary
      summaryEs
      sectionId
      status
      statusEs
      format
      href
      downloadFileName
      keywords
      active
      displayOrder
    }
  }
  listExternalNewsLinks(limit: 50) {
    items {
      id
      title
      url
      source
      active
      displayOrder
    }
  }
  listLeadershipRosterEntries(limit: 50) {
    items {
      id
      groupId
      displayOrder
      lineEn
      lineEs
      active
    }
  }
  listSiteCopies(limit: 200) {
    items {
      id
      key
      valueEn
      valueEs
      description
      active
      displayOrder
    }
  }
}`;

const CMS_CONNECTION_TEST_QUERY = `query TestCmsConnection {
  listSiteSettings(limit: 1) {
    items {
      townName
    }
  }
}`;

/** Stable Dynamo `id` on `OfficialContact` rows required by shell and services. */
export const OFFICIAL_CONTACT_ID_TOWN_INFORMATION = 'town-information';
export const OFFICIAL_CONTACT_ID_CITY_CLERK = 'city-clerk';
export const OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT = 'town-superintendent';

/**
 * localStorage key for the client-side CMS snapshot (`tow-cms-snapshot-v1`).
 *
 * **Cache-first (live refresh):** When a build or browser snapshot is newer than
 * {@link CMS_LIVE_REFRESH_TTL_MS}, the public site skips AppSync on load and on
 * `/documents` refresh — see `docs/aws-cost-optimization-runbook.md`.
 *
 * **7-day offline TTL:** After a successful live AppSync load, the browser persists
 * content here for {@link CMS_SNAPSHOT_TTL_MS} to keep the site usable when AppSync is
 * briefly unavailable. Residents may see content up to seven days old if live fetch
 * never succeeds.
 *
 * **Build snapshot:** `/cms-snapshot.json` is regenerated at deploy
 * (`scripts/generate-cms-snapshot.mjs`) and hydrated before localStorage; it is not
 * stored in localStorage and updates only on the next deploy.
 *
 * **When staff should force refresh:** After Data manager or in-app editor saves when
 * public pages still show old text; after API key rotation or a runtime-config redeploy.
 * Use {@link clearCmsCache} or `/admin` → Clear saved website copy, then Refresh from database.
 */
export const CMS_SNAPSHOT_STORAGE_KEY = 'tow-cms-snapshot-v1';

/** All localStorage keys cleared by {@link clearCmsCache}. */
export const CMS_SNAPSHOT_STORAGE_KEYS = [CMS_SNAPSHOT_STORAGE_KEY] as const;

/** Skip live AppSync when snapshot `savedAt` is within this window (public traffic). */
export const CMS_LIVE_REFRESH_TTL_MS = 6 * 60 * 60 * 1000;

/** Persisted snapshot TTL: seven days in milliseconds. */
export const CMS_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Removes client-side CMS snapshot keys from localStorage.
 *
 * Does not clear in-memory signals or the build-time `/cms-snapshot.json` artifact.
 * For a full staff reload from AppSync, call {@link LocalizedCmsContentStore.forceLiveRefresh}.
 */
export function clearCmsCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    for (const key of CMS_SNAPSHOT_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // localStorage may be blocked in private mode or SSR.
  }
}

interface CmsPersistedSnapshot {
  version: 1;
  savedAt: string;
  buildSha?: string;
  siteSettings?: SiteSettingsRecord;
  alertBannerRecords: AlertBannerRecord[];
  noticeRecords: AnnouncementRecord[];
  eventRecords: EventRecord[];
  contactRecords: OfficialContactRecord[];
  businessRecords: BusinessRecord[];
  publicDocumentRecords: PublicDocumentRecord[];
  externalNewsLinkRecords: ExternalNewsLinkRecord[];
  leadershipRosterRecords?: LeadershipRosterEntryRecord[];
  siteCopyRecords?: SiteCopyRecord[];
}

export type CmsContentSource = 'bundled' | 'loading' | 'live' | 'cached';
export type CmsExtendedLoadState = 'idle' | 'loading' | 'studio' | 'error';

@Injectable({
  providedIn: 'root',
})
export class LocalizedCmsContentStore {
  private static readonly CMS_REQUEST_TIMEOUT_MS = 25_000;
  private static readonly CMS_MAX_RETRIES = 2;
  private static readonly CMS_RETRY_DELAY_MS = 1_500;

  private readonly http = inject(HttpClient);
  private readonly logging = inject(LoggingService);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly previewMode = inject(CmsPreviewModeService);
  private readonly englishDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  private readonly spanishDateFormatter = new Intl.DateTimeFormat('es-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  private readonly siteLanguage = this.siteLanguageService.currentLanguage;
  private readonly siteSettingsState = signal<SiteSettingsRecord | undefined>(undefined);
  private readonly alertBannerRecordsState = signal<AlertBannerRecord[]>([]);
  private readonly noticeRecordsState = signal<AnnouncementRecord[]>([]);
  private readonly eventRecordsState = signal<EventRecord[]>([]);
  private readonly contactRecordsState = signal<OfficialContactRecord[]>([]);
  private readonly businessRecordsState = signal<BusinessRecord[]>([]);
  private readonly publicDocumentRecordsState = signal<PublicDocumentRecord[]>([]);
  private readonly externalNewsLinkRecordsState = signal<ExternalNewsLinkRecord[]>([]);
  private readonly leadershipRosterRecordsState = signal<LeadershipRosterEntryRecord[]>([]);
  private readonly siteCopyRecordsState = signal<SiteCopyRecord[]>([]);
  private readonly loadState = signal<'fallback' | 'loading' | 'studio' | 'error'>('fallback');
  private readonly loadErrorState = signal<string | null>(null);
  private readonly contentSourceState = signal<CmsContentSource>('bundled');
  private readonly extendedLoadState = signal<CmsExtendedLoadState>('idle');
  /** True after `/cms-snapshot.json` or localStorage hydrate; used when live AppSync fails. */
  private offlineSnapshotApplied = false;
  /** `savedAt` from the active build or localStorage snapshot (cache-first gate). */
  private activeSnapshotSavedAt: string | null = null;

  readonly hero = computed(() => this.normalizeHero(this.siteSettingsState(), this.siteLanguage()));
  readonly alertBanner = computed(() =>
    this.normalizeAlertBanner(
      this.pickAlertBanner(this.alertBannerRecordsState()),
      this.siteLanguage(),
    ),
  );
  readonly notices = computed(() =>
    this.normalizeAnnouncements(this.noticeRecordsState(), this.siteLanguage()),
  );
  readonly events = computed(() => this.normalizeEvents(this.eventRecordsState()));
  readonly contacts = computed(() =>
    this.normalizeContacts(this.contactRecordsState(), this.siteLanguage()),
  );
  readonly businesses = computed(() => this.normalizeBusinesses(this.businessRecordsState()));
  readonly publicDocuments = computed(() =>
    this.normalizePublicDocuments(this.publicDocumentRecordsState()),
  );
  readonly linkedAgendaDocumentByEventId = computed(() =>
    buildLinkedAgendaDocumentByEventId(this.publicDocuments()),
  );
  readonly agendaHubHrefByEventId = computed(() =>
    buildAgendaHubHrefByEventId(this.publicDocuments()),
  );
  readonly externalNewsLinks = computed(() =>
    this.normalizeExternalNewsLinks(this.externalNewsLinkRecordsState()),
  );
  /** Localized roster lines keyed by `groupId` (`mayor-council`, `town-administration`). */
  readonly leadershipRosterLinesByGroup = computed(() =>
    this.normalizeLeadershipRosterByGroup(this.leadershipRosterRecordsState(), this.siteLanguage()),
  );

  /**
   * Returns the active CMS override for a UI copy key (if present).
   * Consumers should fall back to bundled APP_COPY when this returns undefined.
   * Keys are stable (e.g. "topTasks.pay-utility.title", "nav.services").
   */
  getSiteCopy(key: string): { en: string; es?: string } | undefined {
    const record = this.siteCopyRecordsState().find(
      (r) => r.key === key && (r.active || this.includeInactiveCmsRecords()),
    );
    if (!record) return undefined;
    return {
      en: record.valueEn,
      es: record.valueEs || undefined,
    };
  }
  /** Active record counts after the latest AppSync load (for `/admin` inventory). */
  readonly modelCounts = computed(() => ({
    SiteSettings: this.siteSettingsState() ? 1 : 0,
    AlertBanner: this.alertBannerRecordsState().length,
    Announcement: this.noticeRecordsState().filter((r) => r.active).length,
    Event: this.eventRecordsState().filter((r) => r.active).length,
    OfficialContact: this.contactRecordsState().length,
    LeadershipRosterEntry: this.leadershipRosterRecordsState().filter((r) => r.active).length,
    Business: this.businessRecordsState().filter((r) => r.active).length,
    PublicDocument: this.publicDocumentRecordsState().filter((r) => r.active).length,
    ExternalNewsLink: this.externalNewsLinkRecordsState().filter((r) => r.active).length,
    SiteCopy: this.siteCopyRecordsState().filter((r) => r.active).length,
  }));
  readonly isLoading = computed(() => this.loadState() === 'loading');
  readonly loadError = computed(() => this.loadErrorState());
  readonly hasLoadFailed = computed(() => this.loadState() === 'error');
  readonly contentSource = computed(() => this.contentSourceState());
  readonly isUsingCachedSnapshot = computed(() => this.contentSourceState() === 'cached');
  readonly extendedLoadFailed = computed(() => this.extendedLoadState() === 'error');
  readonly isExtendedLoading = computed(() => this.extendedLoadState() === 'loading');
  readonly persistenceSummary = computed(() => {
    const language = this.siteLanguage();
    const cmsConfig = this.getCmsRuntimeConfig();

    if (!cmsConfig.apiEndpoint || !cmsConfig.apiKey) {
      return language === 'es'
        ? 'Falta la configuracion de tiempo de ejecucion del CMS de Amplify Studio. El sitio muestra contenido incluido en la aplicacion hasta que se inyecten los ajustes de AppSync durante la compilacion o el despliegue.'
        : 'Amplify Studio CMS runtime config is missing. The site is showing bundled fallback content until AppSync settings are injected at build or deploy time.';
    }

    switch (this.loadState()) {
      case 'loading':
        return language === 'es'
          ? 'Cargando el contenido de la pagina principal desde Amplify Studio.'
          : 'Loading homepage content from Amplify Studio.';
      case 'studio':
        return language === 'es'
          ? 'El contenido de la pagina principal llega desde Amplify Studio por AppSync. La edicion del CMS en el navegador esta deshabilitada.'
          : 'Homepage content is coming from Amplify Studio through AppSync. Browser-based CMS editing is disabled.';
      case 'error':
        return language === 'es'
          ? 'No se pudo cargar el contenido de Amplify Studio. El sitio volvio al contenido incluido en la aplicacion.'
          : 'Amplify Studio content could not be loaded. The site fell back to bundled homepage content.';
      default:
        return language === 'es'
          ? 'Mostrando el contenido incluido en la aplicacion.'
          : 'Showing bundled fallback homepage content.';
    }
  });

  constructor() {
    if (!(globalThis as { __TOW_CMS_SKIP_AUTO_INIT__?: boolean }).__TOW_CMS_SKIP_AUTO_INIT__) {
      void this.initializeContentLoad();
    }
  }

  /**
   * @internal Resets cache state and re-runs the public CMS load sequence (unit tests only).
   */
  resetForUnitTests(): void {
    this.activeSnapshotSavedAt = null;
    this.offlineSnapshotApplied = false;
    this.applyFallbackContent();
    this.extendedLoadState.set('idle');
    this.loadErrorState.set(null);
    void this.initializeContentLoad();
  }

  private async initializeContentLoad(): Promise<void> {
    const hydratedOffline = await this.hydrateFromOfflineSnapshots();
    if (hydratedOffline) {
      this.loadState.set('studio');
    }

    if (this.hasCmsCredentials()) {
      if (this.shouldSkipLiveAppSyncFetch()) {
        this.markContentServedFromSnapshotCache();
        return;
      }

      if (!hydratedOffline) {
        this.loadState.set('loading');
      }
      await this.loadContent();
      return;
    }

    await new Promise<void>((resolve) => queueMicrotask(resolve));

    if (this.hasCmsCredentials()) {
      if (this.shouldSkipLiveAppSyncFetch()) {
        this.markContentServedFromSnapshotCache();
        return;
      }

      if (!hydratedOffline) {
        this.loadState.set('loading');
      }
      await this.loadContent();
    }
  }

  /**
   * Re-fetch CMS content for public pages (document hub navigation, etc.).
   * Skips AppSync when the active snapshot is within {@link CMS_LIVE_REFRESH_TTL_MS}.
   * On AppSync failure, falls back to localStorage or build snapshot for resilience.
   */
  async refreshContent(): Promise<void> {
    if (!this.hasCmsCredentials()) {
      // Re-hydrate from build snapshot / persisted cache instead of wiping PublicDocument rows
      // (document hub calls refresh on navigation; E2E and local serve often lack AppSync keys).
      const rehydrated = await this.hydrateFromOfflineSnapshots();
      if (!rehydrated) {
        this.applyFallbackContent();
      }
      return;
    }

    if (this.shouldSkipLiveAppSyncFetch()) {
      return;
    }

    await this.loadContent();
  }

  /**
   * Clears persisted localStorage snapshot and resets the offline-hydrate flag.
   * Does not fetch from AppSync — pair with {@link forceLiveRefresh} on `/admin`.
   */
  clearPersistedCache(): void {
    clearCmsCache();
    this.offlineSnapshotApplied = false;
    this.activeSnapshotSavedAt = null;
  }

  /**
   * Admin/staff: bypass localStorage snapshot and fetch live AppSync.
   *
   * Clears persisted cache, resets `offlineSnapshotApplied`, and skips offline fallback
   * on this load attempt so errors surface instead of silently reusing stale cache.
   */
  async forceLiveRefresh(): Promise<void> {
    clearCmsCache();
    this.offlineSnapshotApplied = false;
    this.activeSnapshotSavedAt = null;

    if (!this.hasCmsCredentials()) {
      const rehydrated = await this.hydrateFromOfflineSnapshots();
      if (!rehydrated) {
        this.applyFallbackContent();
      }
      return;
    }

    await this.loadContent({ bypassOfflineFallback: true, reconcileAnnouncements: true });
  }

  async testCmsConnection(): Promise<CmsConnectionTestResult> {
    const checkedAt = new Date().toISOString();
    const cmsConfig = this.getCmsRuntimeConfig();

    if (!cmsConfig.apiEndpoint || !cmsConfig.apiKey) {
      return {
        ok: false,
        latencyMs: 0,
        checkedAt,
        recordCount: 0,
        error:
          this.siteLanguage() === 'es'
            ? 'Falta la configuracion de AppSync del CMS en este despliegue.'
            : 'CMS AppSync runtime config is missing on this deployment.',
      };
    }

    const startedAt = performance.now();

    try {
      const response = await this.postCmsGraphql(CMS_CONNECTION_TEST_QUERY);
      const latencyMs = Math.round(performance.now() - startedAt);

      if (response.errors?.length) {
        throw new Error(
          response.errors
            .map((error) => error.message?.trim())
            .filter((message): message is string => Boolean(message))
            .join(' '),
        );
      }

      const records = (response.data?.listSiteSettings?.items ?? []).filter(
        (item): item is SiteSettingsRecord => Boolean(item),
      );

      return {
        ok: true,
        latencyMs,
        checkedAt,
        recordCount: records.length,
        sampleTownName: records[0]?.townName,
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - startedAt),
        checkedAt,
        recordCount: 0,
        error: this.readLoadError(error),
      };
    }
  }

  private async loadContent(options?: {
    bypassOfflineFallback?: boolean;
    reconcileAnnouncements?: boolean;
  }): Promise<void> {
    this.loadState.set('loading');
    this.loadErrorState.set(null);
    this.contentSourceState.set('loading');

    try {
      const coreQuery = this.previewMode.isEnabled()
        ? PUBLIC_CMS_PREVIEW_CORE_QUERY
        : PUBLIC_CMS_CORE_QUERY;
      const coreResponse = await this.postCmsGraphql(coreQuery);
      this.applyCoreResponse(coreResponse);
      if (options?.reconcileAnnouncements) {
        await this.reconcileAnnouncementRecordsFromPrimaryKey();
      }
      this.loadState.set('studio');
      this.contentSourceState.set('live');
      this.persistSnapshot();
      void this.loadExtendedContent();
    } catch (error) {
      // Staff force refresh skips stale localStorage / build-snapshot fallback so errors are visible.
      if (
        !options?.bypassOfflineFallback &&
        (this.restorePersistedSnapshot() || this.offlineSnapshotApplied)
      ) {
        this.loadState.set('studio');
        this.contentSourceState.set('cached');
        this.loadErrorState.set(this.readCachedFallbackMessage());
      } else {
        this.applyFallbackContent();
        this.loadState.set('error');
        this.contentSourceState.set('bundled');
        this.loadErrorState.set(this.readLoadError(error));
      }

      this.logging.log('warn', 'CMS core content load failed', {
        eventType: 'cms_load_failed',
        phase: 'core',
        error: this.readLoadError(error),
        usedCachedSnapshot: this.contentSourceState() === 'cached',
      });
    }
  }

  private async loadExtendedContent(): Promise<void> {
    this.extendedLoadState.set('loading');

    try {
      const extendedQuery = this.previewMode.isEnabled()
        ? PUBLIC_CMS_PREVIEW_EXTENDED_QUERY
        : PUBLIC_CMS_EXTENDED_QUERY;
      const extendedResponse = await this.postCmsGraphql(extendedQuery);
      this.applyExtendedResponse(extendedResponse);
      this.extendedLoadState.set('studio');
      this.persistSnapshot();
    } catch (error) {
      this.extendedLoadState.set('error');
      this.logging.log('warn', 'CMS extended content load failed', {
        eventType: 'cms_load_failed',
        phase: 'extended',
        error: this.readLoadError(error),
      });
    }
  }

  private applyCoreResponse(response: CmsGraphqlResponse): void {
    if (response.errors?.length) {
      throw new Error(this.formatGraphqlErrors(response.errors));
    }

    this.siteSettingsState.set(
      response.data?.listSiteSettings?.items?.find((item): item is SiteSettingsRecord =>
        Boolean(item),
      ),
    );
    this.alertBannerRecordsState.set(
      (response.data?.listAlertBanners?.items ?? []).filter((item): item is AlertBannerRecord =>
        Boolean(item),
      ),
    );
    this.noticeRecordsState.set(
      (response.data?.listAnnouncements?.items ?? []).filter((item): item is AnnouncementRecord =>
        Boolean(item),
      ),
    );
    this.eventRecordsState.set(
      (response.data?.listEvents?.items ?? []).filter((item): item is EventRecord => Boolean(item)),
    );
    this.contactRecordsState.set(
      (response.data?.listOfficialContacts?.items ?? []).filter(
        (item): item is OfficialContactRecord => Boolean(item),
      ),
    );
  }

  /**
   * listAnnouncements can return stale GSI rows after direct DynamoDB fixes; re-fetch each
   * announcement by primary key so attachmentKey and active match the table.
   * Runs on staff forceLiveRefresh and deploy snapshot generation only — not public cache hits.
   */
  private async reconcileAnnouncementRecordsFromPrimaryKey(): Promise<void> {
    const listed = this.noticeRecordsState();
    if (!listed.length) {
      return;
    }

    const refreshed = await Promise.all(
      listed.map(async (item) => {
        try {
          const response = await this.postCmsGraphql(
            `query { getAnnouncement(id: "${item.id}") {
              id title date detail announcementKind attachmentKey priority imageUrl active
            } }`,
          );
          return response.data?.getAnnouncement ?? item;
        } catch {
          return item;
        }
      }),
    );

    this.noticeRecordsState.set(
      refreshed.filter(
        (item: AnnouncementRecord | null | undefined): item is AnnouncementRecord => {
          if (!item) {
            return false;
          }
          return Boolean(item.active) || this.includeInactiveCmsRecords();
        },
      ),
    );
  }

  private applyExtendedResponse(response: CmsGraphqlResponse): void {
    if (response.errors?.length) {
      throw new Error(this.formatGraphqlErrors(response.errors));
    }

    this.businessRecordsState.set(
      (response.data?.listBusinesses?.items ?? []).filter((item): item is BusinessRecord =>
        Boolean(item),
      ),
    );
    this.publicDocumentRecordsState.set(
      (response.data?.listPublicDocuments?.items ?? []).filter(
        (item): item is PublicDocumentRecord => Boolean(item),
      ),
    );
    this.externalNewsLinkRecordsState.set(
      (response.data?.listExternalNewsLinks?.items ?? []).filter(
        (item): item is ExternalNewsLinkRecord => Boolean(item),
      ),
    );
    this.leadershipRosterRecordsState.set(
      (response.data?.listLeadershipRosterEntries?.items ?? []).filter(
        (item): item is LeadershipRosterEntryRecord => Boolean(item),
      ),
    );
    this.siteCopyRecordsState.set(
      (response.data?.listSiteCopies?.items ?? []).filter((item): item is SiteCopyRecord =>
        Boolean(item),
      ),
    );
  }

  private postCmsGraphql(query: string): Promise<CmsGraphqlResponse> {
    const cmsConfig = this.getCmsRuntimeConfig();

    return firstValueFrom(
      this.http
        .post<CmsGraphqlResponse>(
          cmsConfig.apiEndpoint,
          { query },
          {
            headers: {
              'content-type': 'application/json',
              'x-api-key': cmsConfig.apiKey,
            },
          },
        )
        .pipe(
          timeout(LocalizedCmsContentStore.CMS_REQUEST_TIMEOUT_MS),
          retry({
            count: LocalizedCmsContentStore.CMS_MAX_RETRIES,
            delay: (error, retryCount) => {
              if (!this.isRetriableCmsError(error)) {
                return throwError(() => error);
              }

              return timer(LocalizedCmsContentStore.CMS_RETRY_DELAY_MS * retryCount);
            },
          }),
        ),
    );
  }

  private hasCmsCredentials(): boolean {
    const cmsConfig = this.getCmsRuntimeConfig();
    return Boolean(cmsConfig.apiEndpoint && cmsConfig.apiKey);
  }

  private isRetriableCmsError(error: unknown): boolean {
    if (error instanceof HttpErrorResponse) {
      return (
        error.status === 0 ||
        error.status === 408 ||
        error.status === 429 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504
      );
    }

    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name: string }).name === 'TimeoutError'
    ) {
      return true;
    }

    return false;
  }

  private formatGraphqlErrors(errors: { message?: string }[]): string {
    return errors
      .map((error) => error.message?.trim())
      .filter((message): message is string => Boolean(message))
      .join(' ');
  }

  private applyFallbackContent(): void {
    this.siteSettingsState.set(undefined);
    this.alertBannerRecordsState.set([]);
    this.noticeRecordsState.set([]);
    this.eventRecordsState.set([]);
    this.contactRecordsState.set([]);
    this.businessRecordsState.set([]);
    this.publicDocumentRecordsState.set([]);
    this.externalNewsLinkRecordsState.set([]);
    this.leadershipRosterRecordsState.set([]);
  }

  private async hydrateFromOfflineSnapshots(): Promise<boolean> {
    const buildSnapshotLoaded = await this.hydrateFromBuildSnapshot();
    if (buildSnapshotLoaded) {
      this.offlineSnapshotApplied = true;
      return true;
    }

    if (this.restorePersistedSnapshot()) {
      this.offlineSnapshotApplied = true;
      return true;
    }

    return false;
  }

  private async hydrateFromBuildSnapshot(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<CmsPersistedSnapshot>('/cms-snapshot.json', {
          headers: {
            'Cache-Control': 'no-cache',
          },
        }),
      );

      if (response?.version !== 1) {
        return false;
      }

      this.applySnapshot(response);
      return true;
    } catch {
      return false;
    }
  }

  private restorePersistedSnapshot(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const rawSnapshot = window.localStorage.getItem(CMS_SNAPSHOT_STORAGE_KEY);
      if (!rawSnapshot) {
        return false;
      }

      const snapshot = JSON.parse(rawSnapshot) as CmsPersistedSnapshot;
      if (snapshot.version !== 1 || !this.isSnapshotWithinOfflineTtl(snapshot.savedAt)) {
        window.localStorage.removeItem(CMS_SNAPSHOT_STORAGE_KEY);
        return false;
      }

      this.applySnapshot(snapshot);
      return true;
    } catch {
      return false;
    }
  }

  private persistSnapshot(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const snapshot = this.createSnapshot();
      window.localStorage.setItem(CMS_SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      this.activeSnapshotSavedAt = snapshot.savedAt;
    } catch (error) {
      this.logging.log('warn', 'Unable to persist CMS snapshot', {
        eventType: 'cms_snapshot_persist_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private createSnapshot(): CmsPersistedSnapshot {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      buildSha: this.getRuntimeBuildSha(),
      siteSettings: this.siteSettingsState(),
      alertBannerRecords: this.alertBannerRecordsState(),
      noticeRecords: this.noticeRecordsState(),
      eventRecords: this.eventRecordsState(),
      contactRecords: this.contactRecordsState(),
      businessRecords: this.businessRecordsState(),
      publicDocumentRecords: this.publicDocumentRecordsState(),
      externalNewsLinkRecords: this.externalNewsLinkRecordsState(),
      leadershipRosterRecords: this.leadershipRosterRecordsState(),
      siteCopyRecords: this.siteCopyRecordsState(),
    };
  }

  private applySnapshot(snapshot: CmsPersistedSnapshot): void {
    this.siteSettingsState.set(snapshot.siteSettings);
    this.alertBannerRecordsState.set(snapshot.alertBannerRecords ?? []);
    this.noticeRecordsState.set(snapshot.noticeRecords ?? []);
    this.eventRecordsState.set(snapshot.eventRecords ?? []);
    this.contactRecordsState.set(snapshot.contactRecords ?? []);
    this.businessRecordsState.set(snapshot.businessRecords ?? []);
    this.publicDocumentRecordsState.set(snapshot.publicDocumentRecords ?? []);
    this.externalNewsLinkRecordsState.set(snapshot.externalNewsLinkRecords ?? []);
    this.leadershipRosterRecordsState.set(snapshot.leadershipRosterRecords ?? []);
    this.siteCopyRecordsState.set(snapshot.siteCopyRecords ?? []);
    this.activeSnapshotSavedAt = snapshot.savedAt;
    if (this.snapshotIncludesExtendedContent(snapshot)) {
      this.extendedLoadState.set('studio');
    }
  }

  private snapshotIncludesExtendedContent(snapshot: CmsPersistedSnapshot): boolean {
    return (
      (snapshot.businessRecords?.length ?? 0) > 0 ||
      (snapshot.publicDocumentRecords?.length ?? 0) > 0 ||
      (snapshot.externalNewsLinkRecords?.length ?? 0) > 0 ||
      (snapshot.leadershipRosterRecords?.length ?? 0) > 0 ||
      (snapshot.siteCopyRecords?.length ?? 0) > 0
    );
  }

  private shouldSkipLiveAppSyncFetch(): boolean {
    if (this.previewMode.isEnabled()) {
      return false;
    }

    if (!this.hasCmsCredentials() || !this.activeSnapshotSavedAt) {
      return false;
    }

    if (!this.isSnapshotWithinOfflineTtl(this.activeSnapshotSavedAt)) {
      return false;
    }

    return this.isSnapshotWithinLiveRefreshTtl(this.activeSnapshotSavedAt);
  }

  private markContentServedFromSnapshotCache(): void {
    this.loadState.set('studio');
    this.contentSourceState.set('cached');
    if (
      this.extendedLoadState() === 'idle' &&
      (this.businessRecordsState().length > 0 ||
        this.publicDocumentRecordsState().length > 0 ||
        this.externalNewsLinkRecordsState().length > 0 ||
        this.leadershipRosterRecordsState().length > 0 ||
        this.siteCopyRecordsState().length > 0)
    ) {
      this.extendedLoadState.set('studio');
    }
  }

  private isSnapshotWithinOfflineTtl(savedAt: string): boolean {
    const savedAtMs = Date.parse(savedAt);
    if (Number.isNaN(savedAtMs)) {
      return false;
    }

    return Date.now() - savedAtMs <= CMS_SNAPSHOT_TTL_MS;
  }

  private isSnapshotWithinLiveRefreshTtl(savedAt: string): boolean {
    const savedAtMs = Date.parse(savedAt);
    if (Number.isNaN(savedAtMs)) {
      return false;
    }

    return Date.now() - savedAtMs <= CMS_LIVE_REFRESH_TTL_MS;
  }

  private getRuntimeBuildSha(): string | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const build = (window as Window & { __TOW_RUNTIME_CONFIG__?: { build?: { gitSha?: string } } })
      .__TOW_RUNTIME_CONFIG__?.build;

    return typeof build?.gitSha === 'string' && build.gitSha.trim()
      ? build.gitSha.trim()
      : undefined;
  }

  private readCachedFallbackMessage(): string {
    return this.siteLanguage() === 'es'
      ? 'No se pudo cargar contenido en vivo. Mostrando la ultima copia guardada del pueblo.'
      : 'Live town content is unavailable. Showing the last saved town copy.';
  }

  private normalizeHero(
    siteSettings: SiteSettingsRecord | undefined,
    language: SiteLanguage,
  ): CmsHeroContent {
    const englishFallback = DEFAULT_CMS_HERO;
    const localizedFallback = language === 'es' ? DEFAULT_CMS_HERO_ES : DEFAULT_CMS_HERO;

    return {
      eyebrow: this.localizeKnownText(
        siteSettings?.heroEyebrow,
        language,
        englishFallback.eyebrow,
        localizedFallback.eyebrow,
      ),
      status: this.localizeKnownText(
        siteSettings?.heroStatus,
        language,
        englishFallback.status,
        localizedFallback.status,
      ),
      title: this.localizeKnownText(
        siteSettings?.heroTitle ?? siteSettings?.pageTitle ?? siteSettings?.townName,
        language,
        englishFallback.title,
        localizedFallback.title,
      ),
      message: this.localizeKnownText(
        siteSettings?.heroMessage,
        language,
        englishFallback.message,
        localizedFallback.message,
      ),
      subtext: this.localizeKnownText(
        siteSettings?.heroSubtext,
        language,
        englishFallback.subtext,
        localizedFallback.subtext,
      ),
      welcomeLabel: this.localizeKnownText(
        siteSettings?.welcomeLabel,
        language,
        englishFallback.welcomeLabel,
        localizedFallback.welcomeLabel,
      ),
      welcomeHeading: this.localizeKnownText(
        siteSettings?.welcomeHeading,
        language,
        englishFallback.welcomeHeading,
        localizedFallback.welcomeHeading,
      ),
      welcomeBody: this.localizeKnownText(
        siteSettings?.welcomeBody,
        language,
        englishFallback.welcomeBody,
        localizedFallback.welcomeBody,
      ),
      welcomeCaption: this.localizeKnownText(
        siteSettings?.welcomeCaption,
        language,
        englishFallback.welcomeCaption,
        localizedFallback.welcomeCaption,
      ),
      heroImageUrl: siteSettings?.heroImageUrl ?? undefined,
    };
  }

  private normalizeAlertBanner(
    alertBanner: AlertBannerRecord | undefined,
    language: SiteLanguage,
  ): CmsAlertBanner {
    const englishFallback = DEFAULT_CMS_ALERT_BANNER;
    const localizedFallback =
      language === 'es' ? DEFAULT_CMS_ALERT_BANNER_ES : DEFAULT_CMS_ALERT_BANNER;
    const hasIntentionalContent = this.hasIntentionalAlertContent(alertBanner);

    return {
      enabled: Boolean(alertBanner?.enabled) && hasIntentionalContent,
      label: this.localizeKnownText(
        alertBanner?.label,
        language,
        englishFallback.label,
        localizedFallback.label,
      ),
      title: this.localizeKnownText(
        alertBanner?.title,
        language,
        englishFallback.title,
        localizedFallback.title,
      ),
      detail: this.localizeKnownText(
        alertBanner?.detail,
        language,
        englishFallback.detail,
        localizedFallback.detail,
      ),
      linkLabel: this.localizeKnownText(
        alertBanner?.linkLabel,
        language,
        englishFallback.linkLabel,
        localizedFallback.linkLabel,
      ),
      linkHref: this.cleanText(alertBanner?.linkHref) ?? localizedFallback.linkHref,
    };
  }

  private hasIntentionalAlertContent(alertBanner: AlertBannerRecord | undefined): boolean {
    const title = this.cleanText(alertBanner?.title);
    const detail = this.cleanText(alertBanner?.detail);

    return [title, detail].some((value) => Boolean(value && !this.isDefaultAlertText(value)));
  }

  private includeInactiveCmsRecords(): boolean {
    return this.previewMode.isEnabled();
  }

  private recordIsPublic(record: { active?: boolean | null }): boolean {
    return Boolean(record.active) || this.includeInactiveCmsRecords();
  }

  private isDefaultAlertText(value: string): boolean {
    const normalizedValue = this.normalizeComparableText(value);

    return [
      DEFAULT_CMS_ALERT_BANNER.title,
      DEFAULT_CMS_ALERT_BANNER.detail,
      DEFAULT_CMS_ALERT_BANNER_ES.title,
      DEFAULT_CMS_ALERT_BANNER_ES.detail,
      'Use this banner for emergency changes, closures, or critical public information.',
      'Use este banner para emergencias, cierres o informacion publica critica.',
    ].some((fallback) => this.normalizeComparableText(fallback) === normalizedValue);
  }

  private normalizeAnnouncements(
    records: AnnouncementRecord[],
    language: SiteLanguage,
  ): CmsNotice[] {
    const notices = records
      .filter((record) => this.recordIsPublic(record))
      .map((record) => ({
        ...record,
        id: record.id.trim(),
        title: this.cleanText(record.title) ?? '',
        detail: this.cleanText(record.detail) ?? '',
        priority: typeof record.priority === 'number' ? record.priority : Number.MAX_SAFE_INTEGER,
      }))
      .filter((record) => record.id && record.title && record.detail)
      .filter((record) => !this.isRetiredLaunchNotice(record.title, record.detail))
      .filter((record) => {
        const kind = (this.cleanText(record.announcementKind) ?? '').toLowerCase();
        if (kind === 'newsletter') {
          return true;
        }

        return isNoticeDateStillVisible(record.date);
      })
      .sort((left, right) => left.priority - right.priority)
      .map((record) => {
        const englishFallback = DEFAULT_NOTICE_MAP.en.get(record.id);
        const localizedFallback = DEFAULT_NOTICE_MAP[language].get(record.id);
        const kind = (this.cleanText(record.announcementKind) ?? '').toLowerCase();

        return {
          id: record.id,
          title: this.localizeKnownText(
            record.title,
            language,
            englishFallback?.title,
            localizedFallback?.title,
          ),
          date: this.formatDateLabel(
            record.date,
            language,
            englishFallback?.date,
            localizedFallback?.date,
          ),
          detail: this.localizeKnownText(
            record.detail,
            language,
            englishFallback?.detail,
            localizedFallback?.detail,
          ),
          rawDate: this.cleanText(record.date) ?? undefined,
          type: kind === 'newsletter' ? ('newsletter' as const) : ('notice' as const),
          imageUrl: record.imageUrl ?? undefined,
          attachmentKey: this.cleanText(record.attachmentKey) ?? undefined,
        };
      });

    if (notices.length) {
      return notices;
    }

    const fallbackNotices = language === 'es' ? DEFAULT_CMS_NOTICES_ES : DEFAULT_CMS_NOTICES;

    return fallbackNotices.map((notice) => ({ ...notice }));
  }

  private normalizeContacts(
    records: OfficialContactRecord[],
    language: SiteLanguage,
  ): CmsContact[] {
    const contacts = records
      .map((record) => ({
        ...record,
        id: record.id.trim(),
        label: this.cleanText(record.label) ?? '',
        value: this.cleanText(record.value) ?? '',
        detail: this.cleanText(record.detail) ?? '',
        href: this.cleanText(record.href),
        linkLabel: this.cleanText(record.linkLabel),
        displayOrder:
          typeof record.displayOrder === 'number' ? record.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .filter((record) => record.id && record.label && record.value && record.detail)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((record) => {
        const englishFallback = DEFAULT_CONTACT_MAP.en.get(record.id);
        const localizedFallback = DEFAULT_CONTACT_MAP[language].get(record.id);

        return {
          id: record.id,
          label: this.localizeKnownText(
            record.label,
            language,
            englishFallback?.label,
            localizedFallback?.label,
          ),
          value: record.value,
          detail: this.localizeKnownText(
            record.detail,
            language,
            englishFallback?.detail,
            localizedFallback?.detail,
          ),
          href: record.href,
          linkLabel:
            this.cleanText(record.linkLabel) ??
            localizedFallback?.linkLabel ??
            englishFallback?.linkLabel,
        };
      });

    if (!contacts.length) {
      const fallbackContacts = language === 'es' ? DEFAULT_CMS_CONTACTS_ES : DEFAULT_CMS_CONTACTS;

      return fallbackContacts.map((contact) => ({ ...contact }));
    }

    return this.ensureRequiredOfficialContacts(contacts, language);
  }

  private ensureRequiredOfficialContacts(
    contacts: CmsContact[],
    language: SiteLanguage,
  ): CmsContact[] {
    const fallbackContacts = language === 'es' ? DEFAULT_CMS_CONTACTS_ES : DEFAULT_CMS_CONTACTS;
    const contactById = new Map(contacts.map((contact) => [contact.id, contact]));

    this.mergeRequiredOfficialContact(
      contactById,
      contacts,
      OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
      fallbackContacts.find((contact) => contact.id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION),
      (contact, fallback) =>
        contact.id.includes('town-information') ||
        contact.label.toLowerCase().includes('town information') ||
        contact.label.toLowerCase().includes('informacion del pueblo') ||
        contact.href === fallback.href,
    );
    this.mergeRequiredOfficialContact(
      contactById,
      contacts,
      OFFICIAL_CONTACT_ID_CITY_CLERK,
      fallbackContacts.find((contact) => contact.id === OFFICIAL_CONTACT_ID_CITY_CLERK),
      (contact, fallback) =>
        contact.id.includes('clerk') ||
        contact.label.toLowerCase().includes('clerk') ||
        contact.label.toLowerCase().includes('secretaria') ||
        contact.href === fallback.href ||
        contact.linkLabel === fallback.linkLabel ||
        contact.value === fallback.value,
    );
    this.mergeRequiredOfficialContact(
      contactById,
      contacts,
      OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT,
      fallbackContacts.find((contact) => contact.id === OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT),
      (contact, fallback) =>
        contact.id.includes('superintendent') ||
        contact.label.toLowerCase().includes('superintendent') ||
        contact.label.toLowerCase().includes('superintendente') ||
        contact.href === fallback.href ||
        contact.linkLabel === fallback.linkLabel,
    );

    return [...contactById.values()].sort((left, right) => {
      const leftOrder = contacts.findIndex((contact) => contact.id === left.id);
      const rightOrder = contacts.findIndex((contact) => contact.id === right.id);
      const normalizedLeft = leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder;
      const normalizedRight = rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder;

      return normalizedLeft - normalizedRight;
    });
  }

  private mergeRequiredOfficialContact(
    contactById: Map<string, CmsContact>,
    contacts: CmsContact[],
    requiredId: string,
    fallback: CmsContact | undefined,
    matchesCandidate: (contact: CmsContact, fallback: CmsContact) => boolean,
  ): void {
    if (!fallback) {
      return;
    }

    const current = contactById.get(requiredId);
    if (current?.href) {
      return;
    }

    const candidate =
      current ??
      contacts.find((contact) => contact.id !== requiredId && matchesCandidate(contact, fallback));

    if (candidate) {
      if (candidate.id !== requiredId) {
        contactById.delete(candidate.id);
      }

      contactById.set(requiredId, {
        ...fallback,
        ...candidate,
        id: requiredId,
        href: candidate.href ?? fallback.href,
        linkLabel: candidate.linkLabel ?? fallback.linkLabel,
      });
      return;
    }

    contactById.set(requiredId, { ...fallback });
  }

  private normalizeEvents(records: EventRecord[]): CmsCalendarEvent[] {
    return records
      .filter((record) => this.recordIsPublic(record))
      .map((record) => ({
        id: record.id.trim(),
        title: this.cleanText(record.title) ?? '',
        description: this.cleanText(record.description) ?? '',
        location: this.cleanText(record.location) ?? '',
        start: this.cleanText(record.start) ?? '',
        end: this.cleanText(record.end) ?? null,
      }))
      .filter(
        (record) =>
          record.id &&
          record.title &&
          record.start &&
          !Number.isNaN(Date.parse(record.start)) &&
          Date.parse(record.end || record.start) >= Date.now(),
      )
      .sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
  }

  private normalizeBusinesses(records: BusinessRecord[]): CmsBusiness[] {
    return records
      .filter((r) => this.recordIsPublic(r))
      .map((r) => ({
        ...r,
        displayOrder: typeof r.displayOrder === 'number' ? r.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        address: r.address,
        website: this.cleanText(r.website),
        description: this.cleanText(r.description),
        imageUrl: this.cleanText(r.imageUrl),
        displayOrder: r.displayOrder,
      }));
  }

  private normalizePublicDocuments(records: PublicDocumentRecord[]): CmsPublicDocument[] {
    return records
      .filter((r) => this.recordIsPublic(r) && r.sectionId === 'meeting-documents')
      .map((r) => ({
        ...r,
        displayOrder: typeof r.displayOrder === 'number' ? r.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((r) => ({
        id: r.id,
        title: r.title,
        titleEs: r.titleEs?.trim() || undefined,
        summary: r.summary,
        summaryEs: r.summaryEs?.trim() || undefined,
        sectionId: r.sectionId,
        status: r.status,
        statusEs: r.statusEs?.trim() || undefined,
        format: r.format,
        href: r.href,
        downloadFileName: r.downloadFileName ?? '',
        keywords: (r.keywords ?? []).filter((k): k is string => typeof k === 'string'),
      }));
  }

  private normalizeExternalNewsLinks(records: ExternalNewsLinkRecord[]): CmsExternalNewsLink[] {
    return records
      .filter((r) => this.recordIsPublic(r))
      .map((r) => ({
        ...r,
        displayOrder: typeof r.displayOrder === 'number' ? r.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((r) => ({ id: r.id, title: r.title, url: r.url, source: r.source }));
  }

  private normalizeLeadershipRosterByGroup(
    records: LeadershipRosterEntryRecord[],
    language: SiteLanguage,
  ): ReadonlyMap<string, readonly string[]> {
    const prepared = records
      .filter((record) => this.recordIsPublic(record))
      .map((record) => {
        const groupId = (this.cleanText(record.groupId) ?? '').toLowerCase();
        const lineEn = this.cleanText(record.lineEn);
        const lineEs = this.cleanText(record.lineEs);
        const line = language === 'es' ? (lineEs ?? lineEn) : (lineEn ?? lineEs);
        const displayOrder =
          typeof record.displayOrder === 'number' ? record.displayOrder : Number.MAX_SAFE_INTEGER;

        return {
          id: record.id.trim(),
          groupId,
          displayOrder,
          line,
        };
      })
      .filter(
        (row) => row.id && row.groupId && row.line && LEADERSHIP_ROSTER_GROUP_IDS.has(row.groupId),
      )
      .sort((left, right) => {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }

        return left.id.localeCompare(right.id);
      });

    const map = new Map<string, string[]>();

    for (const row of prepared) {
      const bucket = map.get(row.groupId) ?? [];
      bucket.push(row.line!);
      map.set(row.groupId, bucket);
    }

    return map;
  }

  private pickAlertBanner(records: AlertBannerRecord[]): AlertBannerRecord | undefined {
    return [...records].sort((left, right) => {
      const leftEnabled = Boolean(left.enabled) && this.hasIntentionalAlertContent(left);
      const rightEnabled = Boolean(right.enabled) && this.hasIntentionalAlertContent(right);

      if (leftEnabled !== rightEnabled) {
        return leftEnabled ? -1 : 1;
      }

      return (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '');
    })[0];
  }

  private formatDateLabel(
    value: string | null | undefined,
    language: SiteLanguage,
    englishFallback?: string,
    localizedFallback?: string,
  ): string {
    const trimmedValue = this.cleanText(value);

    if (!trimmedValue) {
      return localizedFallback ?? (language === 'es' ? 'Actualizacion del pueblo' : 'Town update');
    }

    if (
      language === 'es' &&
      englishFallback &&
      localizedFallback &&
      trimmedValue === englishFallback
    ) {
      return localizedFallback;
    }

    const parsedDate = new Date(trimmedValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      return (language === 'es' ? this.spanishDateFormatter : this.englishDateFormatter).format(
        parsedDate,
      );
    }

    return language === 'es'
      ? (KNOWN_CMS_TEXT_TRANSLATIONS[trimmedValue] ?? trimmedValue)
      : trimmedValue;
  }

  private localizeKnownText(
    value: string | null | undefined,
    language: SiteLanguage,
    englishFallback?: string,
    localizedFallback?: string,
  ): string {
    const cleanedValue = this.cleanText(value);

    if (language === 'en') {
      return cleanedValue ?? englishFallback ?? '';
    }

    if (!cleanedValue) {
      return localizedFallback ?? englishFallback ?? '';
    }

    if (englishFallback && localizedFallback && cleanedValue === englishFallback) {
      return localizedFallback;
    }

    return KNOWN_CMS_TEXT_TRANSLATIONS[cleanedValue] ?? cleanedValue;
  }

  private isRetiredLaunchNotice(title: string, detail: string): boolean {
    return (
      RETIRED_LAUNCH_NOTICE_TITLES.has(this.normalizeComparableText(title)) ||
      RETIRED_LAUNCH_NOTICE_DETAILS.has(this.normalizeComparableText(detail))
    );
  }

  private normalizeComparableText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  private cleanText(value: string | null | undefined): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 504) {
        return this.siteLanguage() === 'es'
          ? 'El servicio de contenido del pueblo tardo demasiado en responder. Mostrando contenido incluido en la aplicacion.'
          : 'Town content service timed out. Showing bundled homepage content instead.';
      }

      if (error.status === 0) {
        return this.siteLanguage() === 'es'
          ? 'No se pudo conectar con el servicio de contenido del pueblo. Compruebe su conexion e intente de nuevo.'
          : 'Could not reach the town content service. Check your connection and try again.';
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error.trim();
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message.trim();
      }
    }

    if (
      error &&
      typeof error === 'object' &&
      'name' in error &&
      (error as { name: string }).name === 'TimeoutError'
    ) {
      return this.siteLanguage() === 'es'
        ? 'La solicitud de contenido del pueblo excedio el tiempo de espera.'
        : 'The town content request timed out.';
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return this.siteLanguage() === 'es'
      ? 'No se pudo cargar el contenido de Amplify Studio en este momento.'
      : 'Unable to load Amplify Studio content right now.';
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
