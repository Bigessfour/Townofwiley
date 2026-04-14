import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SiteLanguage, SiteLanguageService } from './site-language';

export interface CmsNotice {
  id: string;
  title: string;
  date: string;
  detail: string;
  body?: string;        // multi-paragraph newsletter content, newline-separated
  type?: 'notice' | 'newsletter';
  imageUrl?: string;
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
  summary: string;
  sectionId: string;
  status: string;
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
  subtext: 'Practical homepage for Wiley residents with fast access to key information.',
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
  subtext: 'Página práctica para residentes de Wiley con acceso rápido a información clave.',
  welcomeLabel: '',
  welcomeHeading: 'Bienvenidos al sitio en linea del Pueblo de Wiley',
  welcomeBody: '',
  welcomeCaption: '',
};

const DEFAULT_CMS_ALERT_BANNER: CmsAlertBanner = {
  enabled: false,
  label: 'Town Alert',
  title: 'Urgent town update',
  detail: 'Use this banner for emergency changes, closures, or critical public information.',
  linkLabel: 'Contact Town Hall',
  linkHref: 'tel:+17198294974',
};

const DEFAULT_CMS_ALERT_BANNER_ES: CmsAlertBanner = {
  enabled: false,
  label: 'Alerta del pueblo',
  title: 'Actualizacion urgente del pueblo',
  detail: 'Use este banner para emergencias, cierres o informacion publica critica.',
  linkLabel: 'Contactar al ayuntamiento',
  linkHref: 'tel:+17198294974',
};

const DEFAULT_CMS_NOTICES: CmsNotice[] = [
  {
    id: 'welcome-website',
    title: 'Welcome to the Town of Wiley Official Website',
    date: 'April 2026',
    detail:
      'Explore town services, upcoming meetings, weather updates, and public notices. Contact Town Hall at (719) 829-4974 for assistance.',
  },
  {
    id: 'upcoming-meeting',
    title: 'Town Council Meeting Scheduled',
    date: 'April 13, 2026',
    detail:
      'The next Town Council meeting is scheduled for April 13, 2026 at 7:00 PM at Town Hall. Agenda items include budget review and public comments.',
  },
  {
    id: 'weather-alerts',
    title: 'Severe Weather Alert Sign-Up Available',
    date: 'Ongoing',
    detail:
      'Sign up for SMS weather alerts to stay informed about severe weather conditions in Wiley. Use the weather panel on the homepage.',
  },
];

const DEFAULT_CMS_NOTICES_ES: CmsNotice[] = [
  {
    id: 'welcome-website',
    title: 'Bienvenido al Sitio Web Oficial del Pueblo de Wiley',
    date: 'Abril de 2026',
    detail:
      'Explore los servicios del pueblo, reuniones próximas, actualizaciones del clima y avisos públicos. Contacte al Ayuntamiento al (719) 829-4974 para asistencia.',
  },
  {
    id: 'upcoming-meeting',
    title: 'Reunión del Consejo Municipal Programada',
    date: '13 de abril de 2026',
    detail:
      'La próxima reunión del Consejo Municipal está programada para el 13 de abril de 2026 a las 7:00 PM en el Ayuntamiento. Los temas de la agenda incluyen revisión del presupuesto y comentarios públicos.',
  },
  {
    id: 'weather-alerts',
    title: 'Registro Disponible para Alertas de Clima Severo',
    date: 'Continuo',
    detail:
      'Regístrese para alertas de SMS sobre el clima para mantenerse informado sobre condiciones climáticas severas en Wiley. Use el panel del clima en la página principal.',
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
    detail:
      'Contact the Mayor by email for official town business or council-related questions.',
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
  'Town Alert': 'Alerta del pueblo',
  'Urgent town update': 'Actualizacion urgente del pueblo',
  'Use this banner for emergency changes, closures, or critical public information.':
    'Use este banner para emergencias, cierres o informacion publica critica.',
  'Contact Town Hall': 'Contactar al ayuntamiento',
  'Town services and notices are available here':
    'Los servicios y avisos del pueblo estan disponibles aqui',
  'March 2026': 'Marzo de 2026',
  'Residents can use the website to find meetings, service information, office contacts, weather alerts, and public notices without navigating through multiple departments.':
    'Los residentes pueden usar el sitio web para encontrar reuniones, informacion de servicios, contactos de oficina, alertas del clima y avisos publicos sin navegar por varios departamentos.',
  'Digital self-service rollout planned in phases':
    'El lanzamiento del autoservicio digital esta planeado por fases',
  'Spring 2026': 'Primavera de 2026',
  'Payments, service requests, permits, meeting archives, and records access are being organized around resident tasks instead of department structure.':
    'Los pagos, solicitudes de servicio, permisos, archivos de reuniones y acceso a registros se estan organizando alrededor de tareas de residentes y no por estructura departamental.',
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
  summary: string;
  sectionId: string;
  status: string;
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

interface CmsGraphqlResponse {
  data?: {
    listSiteSettings?: CmsGraphqlList<SiteSettingsRecord>;
    listAlertBanners?: CmsGraphqlList<AlertBannerRecord>;
    listAnnouncements?: CmsGraphqlList<AnnouncementRecord>;
    listEvents?: CmsGraphqlList<EventRecord>;
    listOfficialContacts?: CmsGraphqlList<OfficialContactRecord>;
    listBusinesses?: CmsGraphqlList<BusinessRecord>;
    listPublicDocuments?: CmsGraphqlList<PublicDocumentRecord>;
    listExternalNewsLinks?: CmsGraphqlList<ExternalNewsLinkRecord>;
  };
  errors?: {
    message?: string;
  }[];
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
  listAnnouncements(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      title
      date
      detail
      priority
      imageUrl
      active
    }
  }
  listEvents(filter: { active: { eq: true } }, limit: 50) {
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
  listPublicDocuments(filter: { active: { eq: true } }, limit: 200) {
    items {
      id
      title
      summary
      sectionId
      status
      format
      href
      downloadFileName
      keywords
      active
      displayOrder
    }
  }
  listExternalNewsLinks(filter: { active: { eq: true } }, limit: 50) {
    items {
      id
      title
      url
      source
      active
      displayOrder
    }
  }
}`;

@Injectable({
  providedIn: 'root',
})
export class LocalizedCmsContentStore {
  private readonly http = inject(HttpClient);
  private readonly cmsConfig = this.getCmsRuntimeConfig();
  private readonly siteLanguageService = inject(SiteLanguageService);
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
  private readonly loadState = signal<'fallback' | 'loading' | 'studio' | 'error'>(

    this.cmsConfig.apiEndpoint && this.cmsConfig.apiKey ? 'loading' : 'fallback',
  );
  private readonly loadErrorState = signal<string | null>(null);

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
  readonly externalNewsLinks = computed(() =>
    this.normalizeExternalNewsLinks(this.externalNewsLinkRecordsState()),
  );
  readonly isLoading = computed(() => this.loadState() === 'loading');
  readonly loadError = computed(() => this.loadErrorState());
  readonly persistenceSummary = computed(() => {
    const language = this.siteLanguage();

    if (!this.cmsConfig.apiEndpoint || !this.cmsConfig.apiKey) {
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
    if (this.cmsConfig.apiEndpoint && this.cmsConfig.apiKey) {
      void this.loadContent();
    }
  }

  async refreshContent(): Promise<void> {
    if (!this.cmsConfig.apiEndpoint || !this.cmsConfig.apiKey) {
      this.applyFallbackContent();
      return;
    }

    await this.loadContent();
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
        (response.data?.listEvents?.items ?? []).filter((item): item is EventRecord =>
          Boolean(item),
        ),
      );
      this.contactRecordsState.set(
        (response.data?.listOfficialContacts?.items ?? []).filter(
          (item): item is OfficialContactRecord => Boolean(item),
        ),
      );
      this.businessRecordsState.set(
        (response.data?.listBusinesses?.items ?? []).filter(
          (item): item is BusinessRecord => Boolean(item),
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
      this.loadState.set('studio');
    } catch (error) {
      this.applyFallbackContent();
      this.loadState.set('error');
      this.loadErrorState.set(this.readLoadError(error));
    }
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

    return {
      enabled: Boolean(alertBanner?.enabled),
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

  private normalizeAnnouncements(
    records: AnnouncementRecord[],
    language: SiteLanguage,
  ): CmsNotice[] {
    const notices = records
      .filter((record) => Boolean(record.active))
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
        if (!record.date) {
          return true;
        }

        const parsed = Date.parse(record.date);
        return Number.isNaN(parsed) || parsed >= Date.now();
      })
      .sort((left, right) => left.priority - right.priority)
      .map((record) => {
        const englishFallback = DEFAULT_NOTICE_MAP.en.get(record.id);
        const localizedFallback = DEFAULT_NOTICE_MAP[language].get(record.id);

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
          imageUrl: record.imageUrl ?? undefined,
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

    if (contacts.length) {
      return contacts;
    }

    const fallbackContacts = language === 'es' ? DEFAULT_CMS_CONTACTS_ES : DEFAULT_CMS_CONTACTS;

    return fallbackContacts.map((contact) => ({ ...contact }));
  }

  private normalizeEvents(records: EventRecord[]): CmsCalendarEvent[] {
    return records
      .filter((record) => Boolean(record.active))
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
      .filter((r) => Boolean(r.active))
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
      .filter((r) => Boolean(r.active))
      .map((r) => ({
        ...r,
        displayOrder: typeof r.displayOrder === 'number' ? r.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        sectionId: r.sectionId,
        status: r.status,
        format: r.format,
        href: r.href,
        downloadFileName: r.downloadFileName ?? '',
        keywords: (r.keywords ?? []).filter((k): k is string => typeof k === 'string'),
      }));
  }

  private normalizeExternalNewsLinks(records: ExternalNewsLinkRecord[]): CmsExternalNewsLink[] {
    return records
      .filter((r) => Boolean(r.active))
      .map((r) => ({
        ...r,
        displayOrder: typeof r.displayOrder === 'number' ? r.displayOrder : Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((r) => ({ id: r.id, title: r.title, url: r.url, source: r.source }));
  }

  private pickAlertBanner(records: AlertBannerRecord[]): AlertBannerRecord | undefined {
    return [...records].sort((left, right) => {
      if (left.enabled !== right.enabled) {
        return left.enabled ? -1 : 1;
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
