import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { filter, map, startWith } from 'rxjs';
import { AccessibilitySupport } from './accessibility-support/accessibility-support';
import { LocalizedAiChat } from './ai-chat/localized-ai-chat';
import { getChatbotRuntimeConfig } from './chatbot-config';
import { ClerkSetup } from './clerk-setup/clerk-setup';
import { CmsAdmin } from './cms-admin/cms-admin';
import { DOCUMENT_ARCHIVE } from './document-hub/document-archive';
import { DocumentHub } from './document-hub/document-hub';
import { DOCUMENT_HUB_LINKS } from './document-hub/document-links';
import { RECORDS_CENTER_COPY, RecordsCenter } from './records-center/records-center';
import { ResidentServices } from './resident-services/resident-services';
import {
  CmsAlertBanner,
  CmsCalendarEvent,
  CmsContact,
  LocalizedCmsContentStore,
} from './site-cms-content';
import { SiteLanguage, SiteLanguageService } from './site-language';
import {
  HomepageWeatherAlert,
  LocalizedWeatherPanel,
} from './weather-panel/localized-weather-panel';

interface NavLink {
  label: string;
  href: string;
}

interface TopTask {
  title: string;
  description: string;
  href: string;
  note: string;
}

interface MeetingItem {
  title: string;
  schedule: string;
  format: string;
  location?: string;
  agendaNote?: string;
  cta?: string;
  href?: string;
}

interface CalendarAction {
  label: string;
  href: string;
  downloadFileName?: string;
  external?: boolean;
}

interface CalendarItem {
  id: string;
  source: 'live' | 'seed';
  sourceLabel: string;
  isFeatured: boolean;
  title: string;
  date: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  actions: CalendarAction[];
}

interface CalendarEventSeed {
  title: string;
  dateLabel: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  startLocal: string;
  endLocal: string;
  recurrenceRule?: string;
  extraActions?: CalendarAction[];
  slug: string;
}

interface CalendarOverview {
  statusKicker: string;
  summary: string;
  detail: string;
  nextEventLabel: string;
  nextEventValue: string;
}

interface ServiceCard {
  title: string;
  availability: string;
  description: string;
  href: string;
  cta: string;
}

interface TransparencyItem {
  title: string;
  detail: string;
}

interface TransparencyAction {
  title: string;
  detail: string;
  href: string;
}

interface AccessibilityItem {
  title: string;
  detail: string;
}

interface LeadershipGroup {
  title: string;
  detail: string;
  members: string[];
}

interface SearchItem {
  title: string;
  summary: string;
  category: string;
  href: string;
  keywords: string[];
}

interface CommunityFact {
  label: string;
  value: string;
  detail: string;
}

type FeaturePageId =
  | 'weather'
  | 'notices'
  | 'meetings'
  | 'services'
  | 'records'
  | 'contact'
  | 'accessibility';

type FeatureTitles = Record<FeaturePageId, string>;

interface FeaturePage {
  id: FeaturePageId;
  kicker: string;
  title: string;
  summary: string;
  href: string;
  showOnHomepage: boolean;
}

interface AppCopy {
  skipLinkLabel: string;
  languageLabel: string;
  languageOptions: Record<SiteLanguage, string>;
  siteAlertAriaLabel: string;
  alertHeadline: string;
  alertActionLabel: string;
  nwsAlertLabel: string;
  nwsAlertLinkLabel: string;
  nwsAlertSummarySingle: string;
  nwsAlertSummaryPluralSuffix: string;
  homepageSectionsAriaLabel: string;
  communityFactsAriaLabel: string;
  leadershipAriaLabel: string;
  heroImageAlt: string;
  topTasksKicker: string;
  topTasksHeading: string;
  featureHubKicker: string;
  featureHubHeading: string;
  featureHubBody: string;
  searchKicker: string;
  searchHeading: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchActionLabel: string;
  searchNote: string;
  searchEmptyState: string;
  noticesKicker: string;
  noticesHeading: string;
  meetingsKicker: string;
  meetingsHeading: string;
  openCalendarLabel: string;
  calendarKicker: string;
  calendarHeading: string;
  calendarCopy: string;
  calendarBridgeLabel: string;
  calendarStatusAriaLabel: string;
  calendarStatusKicker: string;
  calendarStatusLiveSummarySingular: string;
  calendarStatusLiveSummaryPlural: string;
  calendarStatusLiveDetail: string;
  calendarStatusFallbackSummary: string;
  calendarStatusFallbackDetail: string;
  calendarStatusNextLabel: string;
  calendarStatusFallbackNextLabel: string;
  calendarManagedBadge: string;
  calendarFallbackBadge: string;
  calendarFeaturedBadge: string;
  calendarPublishedEventCategory: string;
  calendarGoogleActionLabel: string;
  calendarDownloadActionLabel: string;
  calendarAgendaActionLabel: string;
  calendarActionsAriaLabel: string;
  calendarLiveEventCategory: string;
  calendarScheduledEventLabel: string;
  calendarEventFallbackDetail: string;
  calendarEventFallbackLocation: string;
  servicesKicker: string;
  servicesHeading: string;
  transparencyKicker: string;
  transparencyHeading: string;
  accessibilityKicker: string;
  accessibilityHeading: string;
  complianceNote: string;
  contactKicker: string;
  contactHeading: string;
  backHomeLabel: string;
  featureTitles: FeatureTitles;
  footerLinks: NavLink[];
  communityFacts: CommunityFact[];
  navLinks: NavLink[];
  topTasks: TopTask[];
  meetings: MeetingItem[];
  calendarSeeds: CalendarEventSeed[];
  serviceCards: ServiceCard[];
  transparencyItems: TransparencyItem[];
  transparencyActionsLabel: string;
  transparencyActions: TransparencyAction[];
  accessibilityItems: AccessibilityItem[];
  leadershipGroups: LeadershipGroup[];
}

function normalizePath(pathname: string): string {
  const pathWithoutHashOrQuery = pathname.split(/[?#]/, 1)[0] ?? pathname;
  const trimmedPath = pathWithoutHashOrQuery.replace(/\/+$/, '');

  return trimmedPath || '/';
}

const APP_COPY: Record<SiteLanguage, AppCopy> = {
  en: {
    skipLinkLabel: 'Skip to main content',
    languageLabel: 'Site language',
    languageOptions: {
      en: 'English',
      es: 'Espanol',
    },
    siteAlertAriaLabel: 'Town alert banner',
    alertHeadline: 'Severe weather and service alerts for Wiley, 81092',
    alertActionLabel: 'Sign up for text or email alerts',
    nwsAlertLabel: 'National Weather Service Alert',
    nwsAlertLinkLabel: 'Open NWS forecast',
    nwsAlertSummarySingle: '1 active NWS alert for Wiley.',
    nwsAlertSummaryPluralSuffix: 'active NWS alerts for Wiley.',
    homepageSectionsAriaLabel: 'Homepage sections',
    communityFactsAriaLabel: 'Wiley profile',
    leadershipAriaLabel: 'Town leadership roster',
    heroImageAlt:
      'Road entering Wiley, Colorado, with the Wiley city-limit sign beside the roadway.',
    topTasksKicker: 'Quick Tasks',
    topTasksHeading: 'How do I...',
    featureHubKicker: 'Town features',
    featureHubHeading: 'Open the town section you need',
    featureHubBody:
      'The homepage now stays compact. Use these feature pages for weather, notices, meetings, services, records, and Town Hall contacts.',
    searchKicker: 'Wiley Search',
    searchHeading: 'Search Wiley services',
    searchLabel:
      'Find permits, taxes, meetings, utilities, records, and issue reporting in one place.',
    searchPlaceholder: 'Search Wiley services... permits, taxes, meetings',
    searchActionLabel: 'Search',
    searchNote:
      'Use the search bar to jump to the best match, then browse the suggested shortcuts below for related resident tasks.',
    searchEmptyState:
      'No direct match yet. Try permits, taxes, meetings, utilities, records, weather, or road issues.',
    noticesKicker: 'Latest Updates',
    noticesHeading: 'News & Announcements',
    meetingsKicker: 'Meetings and Calendar',
    meetingsHeading: 'Meeting access and community timing belong on the homepage',
    openCalendarLabel: 'Open the full town calendar',
    calendarKicker: 'Calendar',
    calendarHeading:
      'A calendar app should combine meetings, hearings, deadlines, and community events',
    calendarCopy:
      'Start with a single public calendar feed for board meetings, planning hearings, clerk deadlines, school-centered events, and service interruptions. Later, this can grow into filters, ICS exports, and department-managed entries.',
    calendarBridgeLabel: 'Tie alerts back to notices and agendas',
    calendarStatusAriaLabel: 'Calendar publishing status',
    calendarStatusKicker: 'Publishing status',
    calendarStatusLiveSummarySingular: 'upcoming event',
    calendarStatusLiveSummaryPlural: 'upcoming events',
    calendarStatusLiveDetail:
      'These calendar cards reflect the latest meeting and community event information available for Wiley.',
    calendarStatusFallbackSummary: 'Recurring town schedule',
    calendarStatusFallbackDetail:
      'The calendar below lists Wiley\'s regular meeting schedule and key community timing.',
    calendarStatusNextLabel: 'Next upcoming event',
    calendarStatusFallbackNextLabel: 'Next scheduled meeting',
    calendarManagedBadge: 'Updated event',
    calendarFallbackBadge: 'Regular schedule',
    calendarFeaturedBadge: 'Next up',
    calendarPublishedEventCategory: 'Upcoming event',
    calendarGoogleActionLabel: 'Add to Google Calendar',
    calendarDownloadActionLabel: 'Download ICS',
    calendarAgendaActionLabel: 'Agenda details',
    calendarActionsAriaLabel: 'Calendar links',
    calendarLiveEventCategory: 'Community calendar',
    calendarScheduledEventLabel: 'Scheduled event',
    calendarEventFallbackDetail:
      'Meeting details and community event information will appear here.',
    calendarEventFallbackLocation: 'Wiley, Colorado',
    servicesKicker: 'Digital Services',
    servicesHeading: 'Self-service tools should reduce office calls, not add more friction',
    transparencyKicker: 'Transparency',
    transparencyHeading:
      'Records, budgets, and notices must be easy to find and easy to understand',
    accessibilityKicker: 'Accessibility',
    accessibilityHeading:
      'ADA and WCAG 2.1 AA work has to be visible in both design and operations',
    complianceNote:
      'Publish an accessibility statement, keep audits recurring, and provide a direct path for alternate-format and barrier reports.',
    contactKicker: 'Contact and Response Paths',
    contactHeading: 'Residents should always know where to go next',
    backHomeLabel: 'Return to homepage',
    featureTitles: {
      weather: 'Local weather',
      notices: 'Town notices',
      meetings: 'Meetings and calendar',
      services: 'Resident services',
      records: 'Records and documents',
      contact: 'Contact Town Hall',
      accessibility: 'Accessibility statement',
    },
    footerLinks: [
      { label: 'Accessibility statement', href: '/accessibility' },
      { label: 'Public records and FOIA', href: '/records' },
      { label: 'Meeting notices', href: '/meetings' },
      { label: 'Contact Town Hall', href: '/contact' },
    ],
    communityFacts: [
      {
        label: 'Town profile',
        value: 'Wiley is a small statutory town in Prowers County',
        detail:
          'With a 2020 population of about 437 residents, the homepage should stay direct, practical, and easy to scan on phones.',
      },
      {
        label: 'Location',
        value: 'Eastern Colorado plains, ZIP code 81092',
        detail:
          'The site should prioritize weather-sensitive notices, utility updates, road information, and core local services over large-city portal complexity.',
      },
      {
        label: 'Regional access',
        value: 'Near US 287 and centered on local civic life',
        detail:
          'Residents need fast access to meetings, Town Hall contacts, school and community event notices, and everyday service tasks.',
      },
    ],
    navLinks: [
      { label: 'Top Tasks', href: '#top-tasks' },
      { label: 'Weather', href: '/weather' },
      { label: 'Notices', href: '/notices' },
      { label: 'Meetings', href: '/meetings' },
      { label: 'Services', href: '/services' },
      { label: 'Records', href: '/records' },
      { label: 'Contact', href: '/contact' },
    ],
    topTasks: [
      {
        title: 'Pay utility bill',
        description:
          'Surface water and utility payments immediately so residents are not forced to navigate a deep department structure.',
        href: '/services#payment-help',
        note: 'Use the billing help desk to request the current payment path and account guidance.',
      },
      {
        title: 'Report a street or utility issue',
        description:
          'Give residents a direct path for outages, potholes, drainage concerns, and streetlight issues without relying on phone tag.',
        href: '/services#issue-report',
        note: 'Use the issue report form to prepare the right message for town operations.',
      },
      {
        title: 'Find a meeting or agenda',
        description:
          'Put board meetings, notices, agendas, and minutes directly on the homepage for a town where civic information should stay one click away.',
        href: '/meetings',
        note: 'Open meetings information should stay one click away from the homepage.',
      },
      {
        title: 'Request records, permits, or clerk help',
        description:
          'Group routine clerk and permit needs under plain-language labels so residents do not have to guess which office handles the task.',
        href: '/services#records-request',
        note: 'Use the request form to send structured records, permit, and clerk questions.',
      },
    ],
    meetings: [
      {
        title: 'City Council Regular Meeting',
        schedule: 'Every 2nd Monday of each month, starts promptly at 6:00 PM',
        format:
          'Agenda packets, approved minutes, livestream or recording links, and ADA-accessible documents should all publish through this meeting record.',
        location: 'Wiley Town Hall, 304 Main Street',
        agendaNote:
          'Residents should call Town Hall at (719) 829-4974 or email Deb Dillon at deb.dillon@townofwiley.gov if they wish time on the agenda.',
        cta: 'Add the recurring council meeting to your calendar',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      {
        title: 'Planning and zoning review',
        schedule: 'First Thursday of each month, 5:30 PM',
        format:
          'Use this slot for hearing notices, staff reports, application deadlines, and map links.',
        location: 'Wiley Town Hall, 304 Main Street',
      },
      {
        title: 'Community calendar and school-centered events',
        schedule: 'Resident events, closures, and deadlines',
        format:
          'Calendar filters should separate meetings, alerts, school events, recreation, and facility reservations.',
        cta: 'Browse the calendar section',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
    ],
    calendarSeeds: [
      {
        title: 'City Council Regular Meeting',
        dateLabel: 'Every 2nd Monday, 6:00 PM',
        category: 'City Council',
        detail:
          'Make this the canonical event record for agendas, minutes, livestream links, accessible attachments, cancellations, and room changes so residents know exactly where to look each month.',
        location: 'Wiley Town Hall, 304 Main Street',
        recurrence: 'Recurring monthly',
        agendaNote:
          'Residents should call Town Hall at (719) 829-4974 or email Deb Dillon at deb.dillon@townofwiley.gov if they wish to be placed on the agenda before the meeting opens.',
        startLocal: '20260413T180000',
        endLocal: '20260413T190000',
        recurrenceRule: 'FREQ=MONTHLY;BYDAY=2MO',
        extraActions: [
          {
            label: 'Call Town Hall',
            href: 'tel:+17198294974',
          },
          {
            label: 'Email the Clerk',
            href: 'mailto:deb.dillon@townofwiley.gov',
          },
        ],
        slug: 'city-council-regular-meeting',
      },
      {
        title: 'Planning and zoning review',
        dateLabel: 'First Thursday, 5:30 PM',
        category: 'Hearing and land use',
        detail:
          'Attach hearing notices, staff reports, filing deadlines, maps, and application packets directly to the event so the process stays transparent.',
        location: 'Wiley Town Hall, 304 Main Street',
        recurrence: 'Recurring monthly',
        startLocal: '20260402T173000',
        endLocal: '20260402T183000',
        recurrenceRule: 'FREQ=MONTHLY;BYDAY=1TH',
        slug: 'planning-zoning-review',
      },
      {
        title: 'Community deadlines and service updates',
        dateLabel: 'Seasonal deadlines, closures, and town reminders',
        category: 'Community calendar',
        detail:
          'Use calendar cards for cleanup days, utility interruptions, school-centered events, seasonal deadlines, and weather-sensitive notices instead of burying them in scattered updates.',
        location: 'Town-wide notices and service locations',
        recurrence: 'Operational updates',
        startLocal: '20260425T080000',
        endLocal: '20260425T090000',
        slug: 'community-deadlines-service-updates',
      },
    ],
    serviceCards: [
      {
        title: 'Online payments',
        availability: 'Billing help desk',
        description:
          'Open the billing help desk to request the current payment path, account assistance, and follow-up from Wiley staff.',
        href: '/services#payment-help',
        cta: 'Open billing help desk',
      },
      {
        title: 'Street, utility, and property issue reporting',
        availability: 'Self-service',
        description:
          'Focus on a few high-value request types first: utility concerns, potholes, signage, nuisance issues, and public works follow-up.',
        href: '/services#issue-report',
        cta: 'Open issue report form',
      },
      {
        title: 'Permits and licenses',
        availability: 'Business-ready',
        description:
          'Provide application steps, document uploads, fee details, and status tracking without making residents or contractors drive in repeatedly.',
        href: '/services#records-request',
        cta: 'Open permit and records request form',
      },
      {
        title: 'Weather, utility, and emergency alerts',
        availability: 'Multi-channel',
        description:
          'Pair website notices with SMS, email, and app notifications so wind, snow, outages, and service disruptions reach residents quickly.',
        href: '/weather',
        cta: 'Establish alert topics and subscriber controls',
      },
      {
        title: 'Language access for critical services',
        availability: 'Inclusive access',
        description:
          'Start with critical notices, payment help, clerk services, and emergency updates so language access improves the most-used pages first.',
        href: '/accessibility',
        cta: 'Prioritize high-impact pages for translation',
      },
      {
        title: 'Search and document discovery',
        availability: 'Plain-language findability',
        description:
          'Help residents find agendas, forms, ordinances, and services using task-based queries rather than internal government terminology.',
        href: '/#search-panel',
        cta: 'Expand search index and document metadata',
      },
    ],
    transparencyItems: [
      {
        title: 'FOIA and public records',
        detail:
          'Publish records request instructions, fee worksheets, downloadable forms, and response timelines in one clearly labeled location.',
      },
      {
        title: 'Agendas, minutes, and budgets',
        detail:
          'Keep meeting packets, approved minutes, budget summaries, and annual reports searchable and downloadable in accessible formats.',
      },
      {
        title: 'Ordinances and code information',
        detail:
          'Give residents a straightforward way to locate municipal code, zoning references, and enforcement guidance.',
      },
      {
        title: 'Project and service status updates',
        detail:
          'Use status pages or compact dashboards to show road work, closures, utility projects, and request backlogs without forcing phone calls.',
      },
    ],
    transparencyActionsLabel: 'Transparency quick actions',
    transparencyActions: [
      {
        title: 'Open the public records request destination',
        detail:
          'Go to the public records destination for FOIA routing, accessible-copy follow-up, and clerk intake.',
        href: DOCUMENT_HUB_LINKS.requests,
      },
      {
        title: 'Open meeting packets and agenda access',
        detail:
          'Go straight to the public meeting-documents destination for packets, minutes, agenda timing, and calendar access.',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      {
        title: 'Browse budgets, annual reports, and code references',
        detail:
          'Open the finance and ordinance destinations instead of falling back to email-only guidance.',
        href: DOCUMENT_HUB_LINKS.finance,
      },
    ],
    accessibilityItems: [
      {
        title: 'Keyboard and screen-reader support',
        detail:
          'Maintain logical heading order, skip links, focus states, descriptive labels, and consistent navigation on every page.',
      },
      {
        title: 'Readable contrast and resize behavior',
        detail:
          'Keep text contrast at WCAG 2.1 AA levels and ensure content still works when text is enlarged or the page is zoomed.',
      },
      {
        title: 'Accessible documents and media',
        detail:
          'Require searchable PDFs, captioned video, transcripts, alt text, and document publishing workflows that do not create inaccessible archives.',
      },
      {
        title: 'Ongoing compliance operations',
        detail:
          'Publish an accessibility statement, provide a barrier-report form, and schedule recurring audits instead of treating accessibility as a one-time project.',
      },
    ],
    leadershipGroups: [
      {
        title: 'Mayor and Council',
        detail:
          'Elected leadership should be visible near meetings and contact paths so residents can quickly identify who represents them.',
        members: [
          'Mayor: Steve McKitrick',
          'Councilman: Julie Esgar',
          'Councilman: Dale Specht',
          'Councilman: Dale Stewart',
          'Councilman: Alan Campbell',
          'Councilman: Sandy Coen',
        ],
      },
      {
        title: 'Town Administration',
        detail:
          'Administrative leaders should stay visible because small-town residents often need direct, role-based contacts rather than department directories.',
        members: ['City Clerk: Deb Dillon', 'Town Superintendent: Scott Whitman'],
      },
    ],
  },
  es: {
    skipLinkLabel: 'Saltar al contenido principal',
    languageLabel: 'Idioma del sitio',
    languageOptions: {
      en: 'English',
      es: 'Espanol',
    },
    siteAlertAriaLabel: 'Banner de alerta del pueblo',
    alertHeadline: 'Alertas de clima severo y servicios para Wiley, 81092',
    alertActionLabel: 'Inscribirse para alertas por texto o correo',
    nwsAlertLabel: 'Alerta del Servicio Nacional de Meteorologia',
    nwsAlertLinkLabel: 'Abrir pronostico del SMN',
    nwsAlertSummarySingle: '1 alerta activa del NWS para Wiley.',
    nwsAlertSummaryPluralSuffix: 'alertas activas del NWS para Wiley.',
    homepageSectionsAriaLabel: 'Secciones de la pagina principal',
    communityFactsAriaLabel: 'Perfil de Wiley',
    leadershipAriaLabel: 'Directorio de liderazgo del pueblo',
    heroImageAlt:
      'Camino de entrada a Wiley, Colorado, con el letrero del limite de la ciudad junto a la carretera.',
    topTasksKicker: 'Tareas rapidas',
    topTasksHeading: 'Como puedo...',
    featureHubKicker: 'Funciones del pueblo',
    featureHubHeading: 'Abra la seccion del pueblo que necesita',
    featureHubBody:
      'La pagina principal ahora se mantiene compacta. Use estas paginas para clima, avisos, reuniones, servicios, registros y contactos del ayuntamiento.',
    searchKicker: 'Busqueda de Wiley',
    searchHeading: 'Busque servicios de Wiley',
    searchLabel:
      'Encuentre permisos, impuestos, reuniones, servicios, registros y reportes en un solo lugar.',
    searchPlaceholder: 'Busque servicios de Wiley... permisos, impuestos, reuniones',
    searchActionLabel: 'Buscar',
    searchNote:
      'Use la barra de busqueda para ir al mejor resultado y luego revise los accesos directos sugeridos para tareas de residentes.',
    searchEmptyState:
      'Todavia no hay coincidencia directa. Pruebe permisos, impuestos, reuniones, servicios, registros, clima o calles.',
    noticesKicker: 'Novedades',
    noticesHeading: 'Noticias y anuncios',
    meetingsKicker: 'Reuniones y calendario',
    meetingsHeading:
      'El acceso a reuniones y al calendario comunitario debe estar en la pagina principal',
    openCalendarLabel: 'Abrir el calendario completo del pueblo',
    calendarKicker: 'Calendario',
    calendarHeading:
      'Una aplicacion de calendario debe reunir reuniones, audiencias, fechas limite y eventos comunitarios',
    calendarCopy:
      'Empiece con un solo calendario publico para reuniones de juntas, audiencias de planeacion, fechas limite de la oficina del secretario, eventos escolares e interrupciones del servicio. Despues puede crecer con filtros, exportaciones ICS y entradas administradas por departamentos.',
    calendarBridgeLabel: 'Relacionar las alertas con avisos y ordenes del dia',
    calendarStatusAriaLabel: 'Estado de publicacion del calendario',
    calendarStatusKicker: 'Estado de publicacion',
    calendarStatusLiveSummarySingular: 'proximo evento',
    calendarStatusLiveSummaryPlural: 'proximos eventos',
    calendarStatusLiveDetail:
      'Estas tarjetas del calendario muestran la informacion mas reciente disponible sobre reuniones y eventos comunitarios de Wiley.',
    calendarStatusFallbackSummary: 'Horario recurrente del pueblo',
    calendarStatusFallbackDetail:
      'El calendario a continuacion muestra el horario regular de reuniones del pueblo y las fechas comunitarias clave.',
    calendarStatusNextLabel: 'Proximo evento',
    calendarStatusFallbackNextLabel: 'Proxima reunion programada',
    calendarManagedBadge: 'Evento actualizado',
    calendarFallbackBadge: 'Horario regular',
    calendarFeaturedBadge: 'Sigue',
    calendarPublishedEventCategory: 'Proximo evento',
    calendarGoogleActionLabel: 'Agregar a Google Calendar',
    calendarDownloadActionLabel: 'Descargar ICS',
    calendarAgendaActionLabel: 'Detalles de la agenda',
    calendarActionsAriaLabel: 'Enlaces del calendario',
    calendarLiveEventCategory: 'Calendario comunitario',
    calendarScheduledEventLabel: 'Evento programado',
    calendarEventFallbackDetail:
      'Los detalles de reuniones y eventos comunitarios apareceran aqui.',
    calendarEventFallbackLocation: 'Wiley, Colorado',
    servicesKicker: 'Servicios digitales',
    servicesHeading:
      'Las herramientas de autoservicio deben reducir llamadas a la oficina, no crear mas friccion',
    transparencyKicker: 'Transparencia',
    transparencyHeading:
      'Los registros, presupuestos y avisos deben ser faciles de encontrar y faciles de entender',
    accessibilityKicker: 'Accesibilidad',
    accessibilityHeading:
      'El trabajo de ADA y WCAG 2.1 AA debe verse tanto en el diseno como en la operacion',
    complianceNote:
      'Publique una declaracion de accesibilidad, mantenga auditorias recurrentes y ofrezca una via directa para solicitar formatos alternativos y reportar barreras.',
    contactKicker: 'Contacto y rutas de respuesta',
    contactHeading: 'Los residentes siempre deben saber a donde ir despues',
    backHomeLabel: 'Volver a la pagina principal',
    featureTitles: {
      weather: 'Clima local',
      notices: 'Avisos del pueblo',
      meetings: 'Reuniones y calendario',
      services: 'Servicios para residentes',
      records: 'Registros y documentos',
      contact: 'Contactar al ayuntamiento',
      accessibility: 'Declaracion de accesibilidad',
    },
    footerLinks: [
      { label: 'Declaracion de accesibilidad', href: '/accessibility' },
      { label: 'Registros publicos y FOIA', href: '/records' },
      { label: 'Avisos de reuniones', href: '/meetings' },
      { label: 'Contactar al ayuntamiento', href: '/contact' },
    ],
    communityFacts: [
      {
        label: 'Perfil del pueblo',
        value: 'Wiley es un pequeno pueblo estatutario del condado de Prowers',
        detail:
          'Con una poblacion de alrededor de 437 residentes en 2020, la pagina principal debe ser directa, practica y facil de revisar desde el telefono.',
      },
      {
        label: 'Ubicacion',
        value: 'Llanuras del este de Colorado, codigo postal 81092',
        detail:
          'El sitio debe priorizar avisos sensibles al clima, actualizaciones de servicios publicos, informacion vial y servicios locales esenciales por encima de la complejidad de un portal de gran ciudad.',
      },
      {
        label: 'Acceso regional',
        value: 'Cerca de la US 287 y centrado en la vida civica local',
        detail:
          'Los residentes necesitan acceso rapido a reuniones, contactos del ayuntamiento, avisos escolares y comunitarios y tareas de servicio diario.',
      },
    ],
    navLinks: [
      { label: 'Tareas clave', href: '#top-tasks' },
      { label: 'Clima', href: '/weather' },
      { label: 'Avisos', href: '/notices' },
      { label: 'Reuniones', href: '/meetings' },
      { label: 'Servicios', href: '/services' },
      { label: 'Registros', href: '/records' },
      { label: 'Contacto', href: '/contact' },
    ],
    topTasks: [
      {
        title: 'Pagar recibo de servicios',
        description:
          'Muestre de inmediato los pagos de agua y servicios para que los residentes no tengan que navegar una estructura profunda por departamentos.',
        href: '/services#payment-help',
        note: 'Use la mesa de ayuda de facturacion para solicitar la ruta actual de pago y orientacion de cuenta.',
      },
      {
        title: 'Reportar un problema de calle o servicio',
        description:
          'Ofrezca una ruta directa para cortes, baches, drenaje y alumbrado publico sin depender de llamadas repetidas.',
        href: '/services#issue-report',
        note: 'Use el formulario de reporte para preparar el mensaje correcto para operaciones del pueblo.',
      },
      {
        title: 'Encontrar una reunion o agenda',
        description:
          'Ponga reuniones, avisos, agendas y minutas directamente en la pagina principal para que la informacion civica quede a un clic.',
        href: '/meetings',
        note: 'La informacion de reuniones abiertas debe quedar a un solo clic de la pagina principal.',
      },
      {
        title: 'Solicitar registros, permisos o ayuda del secretario',
        description:
          'Agrupe necesidades rutinarias del secretario y permisos con etiquetas sencillas para que los residentes no tengan que adivinar que oficina maneja cada tramite.',
        href: '/services#records-request',
        note: 'Use el formulario de solicitud para enviar preguntas estructuradas sobre registros, permisos y secretaria.',
      },
    ],
    meetings: [
      {
        title: 'Reunion ordinaria del concejo municipal',
        schedule: 'Cada segundo lunes del mes, inicia puntualmente a las 6:00 PM',
        format:
          'Las agendas, minutas aprobadas, enlaces de transmision o grabacion y documentos accesibles por ADA deben publicarse desde este registro de reunion.',
        location: 'Ayuntamiento de Wiley, 304 Main Street',
        agendaNote:
          'Los residentes deben llamar al ayuntamiento al (719) 829-4974 o escribir a Deb Dillon a deb.dillon@townofwiley.gov si desean tiempo en la agenda.',
        cta: 'Agregar la reunion recurrente del concejo a su calendario',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      {
        title: 'Revision de planeacion y zonificacion',
        schedule: 'Primer jueves de cada mes, 5:30 PM',
        format:
          'Use este espacio para avisos de audiencia, reportes del personal, fechas limite de solicitudes y enlaces a mapas.',
        location: 'Ayuntamiento de Wiley, 304 Main Street',
      },
      {
        title: 'Calendario comunitario y eventos centrados en la escuela',
        schedule: 'Eventos para residentes, cierres y fechas limite',
        format:
          'Los filtros del calendario deben separar reuniones, alertas, eventos escolares, recreacion y reservaciones de instalaciones.',
        cta: 'Ver la seccion del calendario',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
    ],
    calendarSeeds: [
      {
        title: 'Reunion ordinaria del concejo municipal',
        dateLabel: 'Cada segundo lunes, 6:00 PM',
        category: 'Concejo municipal',
        detail:
          'Convierta este evento en el registro principal para agendas, minutas, transmisiones, anexos accesibles, cancelaciones y cambios de sala para que los residentes sepan donde buscar cada mes.',
        location: 'Ayuntamiento de Wiley, 304 Main Street',
        recurrence: 'Recurrente cada mes',
        agendaNote:
          'Los residentes deben llamar al ayuntamiento al (719) 829-4974 o escribir a Deb Dillon a deb.dillon@townofwiley.gov si desean ser agregados a la agenda antes de la apertura de la reunion.',
        startLocal: '20260413T180000',
        endLocal: '20260413T190000',
        recurrenceRule: 'FREQ=MONTHLY;BYDAY=2MO',
        extraActions: [
          {
            label: 'Llamar al ayuntamiento',
            href: 'tel:+17198294974',
          },
          {
            label: 'Enviar correo al secretario',
            href: 'mailto:deb.dillon@townofwiley.gov',
          },
        ],
        slug: 'city-council-regular-meeting',
      },
      {
        title: 'Revision de planeacion y zonificacion',
        dateLabel: 'Primer jueves, 5:30 PM',
        category: 'Audiencias y uso de suelo',
        detail:
          'Adjunte avisos de audiencia, reportes, fechas limite, mapas y paquetes de solicitud directamente al evento para mantener la transparencia del proceso.',
        location: 'Ayuntamiento de Wiley, 304 Main Street',
        recurrence: 'Recurrente cada mes',
        startLocal: '20260402T173000',
        endLocal: '20260402T183000',
        recurrenceRule: 'FREQ=MONTHLY;BYDAY=1TH',
        slug: 'planning-zoning-review',
      },
      {
        title: 'Fechas limite comunitarias y actualizaciones de servicio',
        dateLabel: 'Fechas estacionales, cierres y recordatorios del pueblo',
        category: 'Calendario comunitario',
        detail:
          'Use tarjetas de calendario para jornadas de limpieza, interrupciones de servicios, eventos escolares, fechas limite estacionales y avisos sensibles al clima en lugar de esconderlos en actualizaciones dispersas.',
        location: 'Avisos del pueblo y ubicaciones de servicio',
        recurrence: 'Actualizaciones operativas',
        startLocal: '20260425T080000',
        endLocal: '20260425T090000',
        slug: 'community-deadlines-service-updates',
      },
    ],
    serviceCards: [
      {
        title: 'Pagos en linea',
        availability: 'Mesa de ayuda de facturacion',
        description:
          'Abra la mesa de ayuda de facturacion para solicitar la ruta actual de pago, ayuda con la cuenta y seguimiento del personal de Wiley.',
        href: '/services#payment-help',
        cta: 'Abrir ayuda de facturacion',
      },
      {
        title: 'Reporte de calles, servicios y problemas de propiedad',
        availability: 'Autoservicio',
        description:
          'Enfoquese primero en unos cuantos tipos de solicitud de alto valor: servicios, baches, senalizacion, molestias y seguimiento de obras publicas.',
        href: '/services#issue-report',
        cta: 'Abrir formulario de reporte',
      },
      {
        title: 'Permisos y licencias',
        availability: 'Listo para negocios',
        description:
          'Ofrezca pasos de solicitud, carga de documentos, detalles de cuotas y seguimiento de estado sin obligar a residentes o contratistas a viajar repetidamente.',
        href: '/services#records-request',
        cta: 'Abrir formulario de permisos y registros',
      },
      {
        title: 'Alertas de clima, servicios y emergencias',
        availability: 'Multicanal',
        description:
          'Combine avisos del sitio con SMS, correo electronico y notificaciones para que viento, nieve, cortes y cambios de servicio lleguen rapido a los residentes.',
        href: '/weather',
        cta: 'Definir temas de alerta y controles para suscriptores',
      },
      {
        title: 'Acceso en otros idiomas para servicios criticos',
        availability: 'Acceso inclusivo',
        description:
          'Empiece con avisos criticos, ayuda de facturacion, servicios de secretaria y actualizaciones de emergencia para mejorar primero las paginas de uso mas frecuente.',
        href: '/accessibility',
        cta: 'Priorizar paginas de alto impacto para traduccion',
      },
      {
        title: 'Busqueda y descubrimiento de documentos',
        availability: 'Busqueda en lenguaje sencillo',
        description:
          'Ayude a los residentes a encontrar agendas, formularios, ordenanzas y servicios mediante consultas orientadas a tareas y no a terminologia interna del gobierno.',
        href: '/#search-panel',
        cta: 'Ampliar el indice de busqueda y los metadatos de documentos',
      },
    ],
    transparencyItems: [
      {
        title: 'FOIA y registros publicos',
        detail:
          'Publique instrucciones para solicitudes de registros, tablas de cuotas, formularios descargables y tiempos de respuesta en un solo lugar claramente identificado.',
      },
      {
        title: 'Agendas, minutas y presupuestos',
        detail:
          'Mantenga las agendas, minutas aprobadas, resumenes de presupuesto e informes anuales en formatos accesibles, descargables y faciles de buscar.',
      },
      {
        title: 'Ordenanzas e informacion del codigo',
        detail:
          'Ofrezca una forma directa para localizar el codigo municipal, referencias de zonificacion y orientacion de cumplimiento.',
      },
      {
        title: 'Actualizaciones de proyectos y estado del servicio',
        detail:
          'Use paginas de estado o paneles compactos para mostrar obras viales, cierres, proyectos de servicios y atrasos de solicitudes sin obligar a llamar.',
      },
    ],
    transparencyActionsLabel: 'Acciones rapidas de transparencia',
    transparencyActions: [
      {
        title: 'Abrir el destino publico de registros',
        detail:
          'Vaya al destino publico de registros para la ruta FOIA, copias accesibles y solicitudes con la secretaria.',
        href: DOCUMENT_HUB_LINKS.requests,
      },
      {
        title: 'Abrir paquetes y acceso a agendas',
        detail:
          'Vaya directamente al destino publico de documentos de reuniones para paquetes, minutas, tiempos de agenda y acceso al calendario.',
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      {
        title: 'Explorar presupuestos, informes y referencias de codigo',
        detail:
          'Abra los destinos de finanzas y ordenanzas en lugar de depender solo del correo electronico.',
        href: DOCUMENT_HUB_LINKS.finance,
      },
    ],
    accessibilityItems: [
      {
        title: 'Soporte para teclado y lectores de pantalla',
        detail:
          'Mantenga un orden logico de encabezados, enlaces para saltar contenido, estados de foco, etiquetas descriptivas y navegacion consistente en cada pagina.',
      },
      {
        title: 'Contraste legible y comportamiento al ampliar',
        detail:
          'Mantenga el contraste de texto al nivel WCAG 2.1 AA y asegure que el contenido siga funcionando cuando el texto se amplie o la pagina se haga zoom.',
      },
      {
        title: 'Documentos y medios accesibles',
        detail:
          'Exija PDF buscables, video con subtitulos, transcripciones, texto alternativo y flujos de publicacion que no creen archivos inaccesibles.',
      },
      {
        title: 'Operacion continua de cumplimiento',
        detail:
          'Publique una declaracion de accesibilidad, ofrezca un formulario para reportar barreras y programe auditorias recurrentes en lugar de tratar la accesibilidad como un proyecto unico.',
      },
    ],
    leadershipGroups: [
      {
        title: 'Alcalde y concejo',
        detail:
          'El liderazgo electo debe verse cerca de reuniones y rutas de contacto para que los residentes identifiquen rapidamente quien los representa.',
        members: [
          'Alcalde: Steve McKitrick',
          'Concejal: Julie Esgar',
          'Concejal: Dale Specht',
          'Concejal: Dale Stewart',
          'Concejal: Alan Campbell',
          'Concejal: Sandy Coen',
        ],
      },
      {
        title: 'Administracion del pueblo',
        detail:
          'Los lideres administrativos deben seguir visibles porque los residentes de pueblos pequenos suelen necesitar contactos directos por funcion y no directorios por departamento.',
        members: ['Secretaria municipal: Deb Dillon', 'Superintendente del pueblo: Scott Whitman'],
      },
    ],
  },
};

@Component({
  selector: 'app-root',
  imports: [
    NgOptimizedImage,
    RouterLink,
    FullCalendarModule,
    AccessibilitySupport,
    LocalizedAiChat,
    LocalizedWeatherPanel,
    CmsAdmin,
    ClerkSetup,
    DocumentHub,
    RecordsCenter,
    ResidentServices,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly chatbotConfig = getChatbotRuntimeConfig();
  private readonly router = inject(Router);
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly initialPath =
    typeof window !== 'undefined'
      ? normalizePath(`${window.location.pathname}${window.location.search}${window.location.hash}`)
      : normalizePath(this.router.url);
  private readonly initialFragment =
    typeof window !== 'undefined'
      ? window.location.hash.replace(/^#/, '')
      : this.router.parseUrl(this.router.url).fragment ?? '';
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => normalizePath(this.router.url)),
      startWith(this.initialPath),
    ),
    { initialValue: this.initialPath },
  );
  private readonly currentFragment = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.parseUrl(this.router.url).fragment ?? ''),
      startWith(this.initialFragment),
    ),
    { initialValue: this.initialFragment },
  );
  private readonly routedFragmentScrollEffect = effect(() => {
    const fragment = this.currentFragment();

    if (!fragment) {
      return;
    }

    this.scheduleFragmentScroll(`#${fragment}`);
  });

  protected readonly calendarOptions = computed(() => ({
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    events: this.calendarItems().map(item => ({
      title: item.title,
      start: item.date,
      extendedProps: { item }
    })),
    eventClick: (info: any) => {
      // handle click
    }
  }));

  protected readonly searchQuery = signal('');
  protected readonly homepageWeatherAlert = signal<HomepageWeatherAlert | null>(null);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly isAdminMode = computed(() => this.currentPath() === '/admin');
  protected readonly isClerkSetupMode = computed(() => this.currentPath() === '/clerk-setup');
  protected readonly isDocumentHubMode = computed(() => this.currentPath() === '/documents');
  protected readonly isWeatherMode = computed(() => this.currentPath() === '/weather');
  protected readonly isNoticesMode = computed(() => this.currentPath() === '/notices');
  protected readonly isMeetingsMode = computed(() => this.currentPath() === '/meetings');
  protected readonly isServicesMode = computed(() => this.currentPath() === '/services');
  protected readonly isRecordsMode = computed(() => this.currentPath() === '/records');
  protected readonly isContactMode = computed(() => this.currentPath() === '/contact');
  protected readonly isAccessibilityMode = computed(() => this.currentPath() === '/accessibility');
  protected readonly isFeaturePageMode = computed(
    () =>
      this.isWeatherMode() ||
      this.isNoticesMode() ||
      this.isMeetingsMode() ||
      this.isServicesMode() ||
      this.isRecordsMode() ||
      this.isContactMode() ||
      this.isAccessibilityMode(),
  );
  protected readonly shouldPrimeWeatherAlerts = computed(
    () =>
      !this.isAdminMode() &&
      !this.isClerkSetupMode() &&
      !this.isDocumentHubMode() &&
      !this.isWeatherMode(),
  );
  protected readonly isProgrammaticChatEnabled =
    this.chatbotConfig.mode === 'api' && Boolean(this.chatbotConfig.apiEndpoint);
  protected readonly isAssistantEnabled = this.chatbotConfig.mode !== 'none';
  protected readonly heroContent = this.cmsStore.hero;
  protected readonly cmsAlertBanner = this.cmsStore.alertBanner;
  protected readonly pageTitle = computed(() => this.heroContent().title);
  protected readonly notices = this.cmsStore.notices;
  protected readonly liveCalendarEvents = this.cmsStore.events;
  protected readonly contacts = this.cmsStore.contacts;
  protected readonly siteLanguage = this.siteLanguageService.currentLanguage;
  protected readonly appCopy = computed(() => APP_COPY[this.siteLanguage()]);
  protected readonly primaryContact = computed<CmsContact | null>(() => {
    return (
      this.contacts().find((contact) => contact.id === 'town-information') ??
      this.contacts()[0] ??
      null
    );
  });
  protected readonly clerkContact = computed<CmsContact | null>(() => {
    return (
      this.contacts().find((contact) => contact.id === 'city-clerk') ?? this.contacts()[1] ?? null
    );
  });
  protected readonly alertBanner = computed<CmsAlertBanner>(() => {
    const weatherAlert = this.homepageWeatherAlert();

    if (weatherAlert) {
      return {
        enabled: true,
        label:
          weatherAlert.total === 1
            ? this.appCopy().nwsAlertLabel
            : `${this.appCopy().nwsAlertLabel} · ${weatherAlert.total} ${this.appCopy().nwsAlertSummaryPluralSuffix}`,
        title: weatherAlert.event,
        detail: [
          weatherAlert.headline,
          weatherAlert.total === 1
            ? this.appCopy().nwsAlertSummarySingle
            : `${weatherAlert.total} ${this.appCopy().nwsAlertSummaryPluralSuffix}`,
        ]
          .filter(Boolean)
          .join(' '),
        linkLabel: this.appCopy().nwsAlertLinkLabel,
        linkHref: weatherAlert.forecastUrl,
      };
    }

    return this.cmsAlertBanner();
  });
  protected readonly communityFacts = computed(() => this.appCopy().communityFacts);
  protected readonly navLinks = computed(() => this.appCopy().navLinks);
  protected readonly topTasks = computed(() => this.appCopy().topTasks);
  protected readonly featurePages = computed<FeaturePage[]>(() => {
    const copy = this.appCopy();
    const alertBanner = this.alertBanner();
    const latestNotice = this.notices()[0];
    const nextCalendarItem = this.calendarItems()[0];
    const primaryContact = this.primaryContact();
    const clerkContact = this.clerkContact();

    return [
      {
        id: 'weather',
        kicker: copy.nwsAlertLabel,
        title: copy.featureTitles.weather,
        summary:
          [alertBanner.title, alertBanner.detail].filter(Boolean).join(' ') || copy.alertHeadline,
        href: '/weather',
        showOnHomepage: true,
      },
      {
        id: 'notices',
        kicker: copy.noticesKicker,
        title: copy.featureTitles.notices,
        summary: latestNotice
          ? `${latestNotice.title}. ${latestNotice.detail}`
          : copy.noticesHeading,
        href: '/notices',
        showOnHomepage: true,
      },
      {
        id: 'meetings',
        kicker: copy.meetingsKicker,
        title: copy.featureTitles.meetings,
        summary: nextCalendarItem
          ? `${nextCalendarItem.title}. ${nextCalendarItem.date}`
          : copy.openCalendarLabel,
        href: '/meetings',
        showOnHomepage: true,
      },
      {
        id: 'services',
        kicker: copy.servicesKicker,
        title: copy.featureTitles.services,
        summary: copy.topTasks
          .slice(0, 3)
          .map((task) => task.title)
          .join(' · '),
        href: '/services',
        showOnHomepage: true,
      },
      {
        id: 'records',
        kicker: copy.transparencyKicker,
        title: copy.featureTitles.records,
        summary: copy.transparencyHeading,
        href: '/records',
        showOnHomepage: true,
      },
      {
        id: 'contact',
        kicker: copy.contactKicker,
        title: copy.featureTitles.contact,
        summary:
          [primaryContact?.value, clerkContact?.linkLabel ?? clerkContact?.value]
            .filter(Boolean)
            .join(' · ') || copy.contactHeading,
        href: '/contact',
        showOnHomepage: true,
      },
      {
        id: 'accessibility',
        kicker: copy.accessibilityKicker,
        title: copy.featureTitles.accessibility,
        summary: copy.complianceNote,
        href: '/accessibility',
        showOnHomepage: false,
      },
    ];
  });
  protected readonly homepageFeaturePages = computed(() =>
    this.featurePages().filter((page) => page.showOnHomepage),
  );
  protected readonly currentFeaturePage = computed<FeaturePage | null>(() => {
    return this.featurePages().find((page) => page.href === this.currentPath()) ?? null;
  });
  protected readonly meetings = computed(() => this.appCopy().meetings);
  protected readonly calendarItems = computed(() => {
    const liveEvents = this.liveCalendarEvents();

    if (liveEvents.length) {
      return liveEvents.map((event, index) => this.createCalendarItemFromEvent(event, index === 0));
    }

    return this.appCopy().calendarSeeds.map((seed, index) =>
      this.createCalendarItem(seed, index === 0),
    );
  });
  protected readonly calendarOverview = computed<CalendarOverview>(() => {
    const copy = this.appCopy();
    const liveEvents = this.liveCalendarEvents();

    if (liveEvents.length) {
      const nextEvent = liveEvents[0];
      const start = new Date(nextEvent.start);
      const end = this.resolveCalendarEventEnd(nextEvent);

      return {
        statusKicker: copy.calendarStatusKicker,
        summary:
          liveEvents.length === 1
            ? `1 ${copy.calendarStatusLiveSummarySingular}`
            : `${liveEvents.length} ${copy.calendarStatusLiveSummaryPlural}`,
        detail: copy.calendarStatusLiveDetail,
        nextEventLabel: copy.calendarStatusNextLabel,
        nextEventValue: `${nextEvent.title} · ${this.formatCalendarEventDate(start, end)}`,
      };
    }

    return {
      statusKicker: copy.calendarStatusKicker,
      summary: copy.calendarStatusFallbackSummary,
      detail: copy.calendarStatusFallbackDetail,
      nextEventLabel: copy.calendarStatusFallbackNextLabel,
      nextEventValue: copy.calendarSeeds[0]?.dateLabel ?? copy.openCalendarLabel,
    };
  });
  protected readonly serviceCards = computed(() => this.appCopy().serviceCards);
  protected readonly transparencyItems = computed(() => this.appCopy().transparencyItems);
  protected readonly transparencyActionsLabel = computed(
    () => this.appCopy().transparencyActionsLabel,
  );
  protected readonly transparencyActions = computed(() => this.appCopy().transparencyActions);
  protected readonly accessibilityItems = computed(() => this.appCopy().accessibilityItems);
  protected readonly leadershipGroups = computed(() => this.appCopy().leadershipGroups);
  protected readonly searchIndex = computed<SearchItem[]>(() => {
    const copy = this.appCopy();
    const recordsCopy = RECORDS_CENTER_COPY[this.siteLanguage()];
    const alertBanner = this.alertBanner();
    const weatherKeywords =
      this.siteLanguage() === 'en'
        ? ['weather', 'forecast', 'alerts', 'warning', 'watch', 'advisory', 'wind', 'snow']
        : [
            'clima',
            'pronostico',
            'alertas',
            'advertencia',
            'vigilancia',
            'aviso',
            'viento',
            'nieve',
          ];

    const items: SearchItem[] = [
      {
        title: alertBanner.title || copy.alertHeadline,
        summary: alertBanner.detail || this.heroContent().message,
        category: copy.nwsAlertLabel,
        href: '/weather',
        keywords: this.buildSearchKeywords(
          copy.alertHeadline,
          copy.alertActionLabel,
          copy.nwsAlertLinkLabel,
          ...weatherKeywords,
        ),
      },
      ...this.topTasks().map((task) => ({
        title: task.title,
        summary: task.description,
        category: copy.topTasksKicker,
        href: task.href,
        keywords: this.buildSearchKeywords(task.description, task.note),
      })),
      ...this.meetings().map((meeting) => ({
        title: meeting.title,
        summary: meeting.format,
        category: copy.meetingsKicker,
        href: '/meetings',
        keywords: this.buildSearchKeywords(
          meeting.schedule,
          meeting.location,
          meeting.agendaNote,
          meeting.cta,
        ),
      })),
      ...this.calendarItems().map((item) => ({
        title: item.title,
        summary: item.detail,
        category: copy.calendarKicker,
        href: '/meetings',
        keywords: this.buildSearchKeywords(
          item.date,
          item.category,
          item.location,
          item.recurrence,
          item.agendaNote,
          ...item.actions.map((action) => action.label),
        ),
      })),
      ...recordsCopy.guides.map((guide) => ({
        title: guide.title,
        summary: guide.detail,
        category: recordsCopy.kicker,
        href: guide.href,
        keywords: this.buildSearchKeywords(guide.kicker, guide.cta),
      })),
      ...DOCUMENT_ARCHIVE[this.siteLanguage()].map((document) => ({
        title: document.title,
        summary: document.summary,
        category: recordsCopy.kicker,
        href: document.href,
        keywords: this.buildSearchKeywords(
          document.updatedAt,
          document.format,
          ...document.keywords,
        ),
      })),
      ...this.serviceCards().map((service) => ({
        title: service.title,
        summary: service.description,
        category: copy.servicesKicker,
        href: service.href,
        keywords: this.buildSearchKeywords(service.availability, service.cta),
      })),
      ...this.transparencyActions().map((action) => ({
        title: action.title,
        summary: action.detail,
        category: copy.transparencyKicker,
        href: action.href,
        keywords: this.buildSearchKeywords(action.detail),
      })),
      ...this.notices().map((notice) => ({
        title: notice.title,
        summary: notice.detail,
        category: copy.noticesKicker,
        href: '/notices',
        keywords: this.buildSearchKeywords(notice.date),
      })),
      ...this.contacts().map((contact) => ({
        title: contact.value ? `${contact.label}: ${contact.value}` : contact.label,
        summary: contact.detail,
        category: copy.contactKicker,
        href: contact.href ?? '/contact',
        keywords: this.buildSearchKeywords(contact.label, contact.value, contact.linkLabel),
      })),
      ...this.accessibilityItems().map((item) => ({
        title: item.title,
        summary: item.detail,
        category: copy.accessibilityKicker,
        href: '/accessibility',
        keywords: this.buildSearchKeywords(item.detail),
      })),
    ];

    return this.dedupeSearchItems(items);
  });

  protected focusMainContent(): void {
    queueMicrotask(() => {
      this.mainContent()?.nativeElement.focus();
    });
  }
  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const searchIndex = this.searchIndex();

    if (!query) {
      return searchIndex.slice(0, 5);
    }

    const terms: string[] = query.split(/\s+/).filter(Boolean);

    return searchIndex.filter((item) => {
      const haystack = [item.title, item.summary, item.category, ...item.keywords]
        .join(' ')
        .toLowerCase();

      return terms.every((term) => haystack.includes(term));
    });
  });

  protected updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  protected performSearch(event?: Event): void {
    event?.preventDefault();

    if (!this.searchQuery().trim()) {
      this.scrollToFragment('#search-panel');
      return;
    }

    const firstResult = this.searchResults()[0];

    if (!firstResult) {
      this.scrollToFragment('#search-panel');
      return;
    }

    const [path, fragment] = firstResult.href.split('#');
    this.router.navigate([path], { fragment: fragment || undefined });
  }

  protected openSignup(): void {
    if (this.isWeatherMode()) {
      this.scrollToFragment('#weather-signup-heading', '#weather');
      return;
    }

    this.router.navigate(['/weather']);
  }

  protected openCalendar(event?: Event): void {
    event?.preventDefault();

    if (this.isMeetingsMode()) {
      this.scrollToFragment('#calendar');
      return;
    }

    this.router.navigate(['/meetings'], { fragment: 'calendar' });
  }

  protected updateHomepageWeatherAlert(alert: HomepageWeatherAlert | null): void {
    this.homepageWeatherAlert.set(alert);
  }

  protected updateSiteLanguage(value: string): void {
    this.siteLanguageService.setLanguage(value);
  }

  private buildSearchKeywords(...values: (string | null | undefined)[]): string[] {
    return values.filter((value): value is string => Boolean(value?.trim()));
  }

  private dedupeSearchItems(items: SearchItem[]): SearchItem[] {
    const seen = new Set<string>();

    return items.filter((item) => {
      const key = `${item.href}::${item.title}`.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private navigateToHref(href: string): void {
    if (typeof window === 'undefined' || !href) {
      return;
    }

    if (href.startsWith('#')) {
      this.scrollToFragment(href);
      return;
    }

    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('/documents/archive/')
    ) {
      window.location.assign(href);
      return;
    }

    const [path, fragment] = href.split('#', 2);

    if (fragment && normalizePath(path || this.router.url) === this.currentPath()) {
      this.scrollToFragment(`#${fragment}`);
      return;
    }

    try {
      const urlTree = this.router.parseUrl(path || this.router.url);
      urlTree.fragment = fragment || null;

      void this.router.navigateByUrl(urlTree).then((didNavigate) => {
        if (didNavigate && fragment) {
          this.scheduleFragmentScroll(`#${fragment}`);
        }
      });
    } catch {
      window.location.assign(href);
    }
  }

  private scheduleFragmentScroll(fragment: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      this.scrollToFragment(fragment);
    }, 0);
  }

  private scrollToFragment(fragment: string, fallbackFragment?: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const target =
      document.querySelector<HTMLElement>(fragment) ??
      (fallbackFragment ? document.querySelector<HTMLElement>(fallbackFragment) : null);

    if (!target) {
      return;
    }

    const targetId = target.getAttribute('id');

    if (typeof window !== 'undefined' && targetId) {
      const nextUrl = `${window.location.pathname}${window.location.search}#${targetId}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }

    queueMicrotask(() => {
      target.focus({ preventScroll: true });
    });
  }

  private createCalendarItem(seed: CalendarEventSeed, isFeatured: boolean): CalendarItem {
    const copy = this.appCopy();

    return {
      id: seed.slug,
      source: 'seed',
      sourceLabel: copy.calendarFallbackBadge,
      isFeatured,
      title: seed.title,
      date: seed.dateLabel,
      category: seed.category,
      detail: seed.detail,
      location: seed.location,
      recurrence: seed.recurrence,
      agendaNote: seed.agendaNote,
      actions: [
        {
          label: copy.calendarGoogleActionLabel,
          href: this.createGoogleCalendarLink(seed),
          external: true,
        },
        {
          label: copy.calendarDownloadActionLabel,
          href: this.createIcsLink(seed),
          downloadFileName: `${seed.slug}.ics`,
        },
        {
          label: copy.calendarAgendaActionLabel,
          href: DOCUMENT_HUB_LINKS.meetings,
        },
        ...(seed.extraActions ?? []),
      ],
    };
  }

  private createCalendarItemFromEvent(event: CmsCalendarEvent, isFeatured: boolean): CalendarItem {
    const copy = this.appCopy();
    const start = new Date(event.start);
    const end = this.resolveCalendarEventEnd(event);

    return {
      id: event.id,
      source: 'live',
      sourceLabel: copy.calendarManagedBadge,
      isFeatured,
      title: event.title,
      date: this.formatCalendarEventDate(start, end),
      category: copy.calendarPublishedEventCategory,
      detail: event.description || copy.calendarEventFallbackDetail,
      location: event.location || copy.calendarEventFallbackLocation,
      recurrence: copy.calendarScheduledEventLabel,
      actions: [
        {
          label: copy.calendarGoogleActionLabel,
          href: this.createGoogleCalendarLinkFromEvent(event, end),
          external: true,
        },
        {
          label: copy.calendarDownloadActionLabel,
          href: this.createIcsLinkFromEvent(event, end),
          downloadFileName: `${event.id}.ics`,
        },
        {
          label: copy.calendarAgendaActionLabel,
          href: DOCUMENT_HUB_LINKS.meetings,
        },
      ],
    };
  }

  private createGoogleCalendarLink(seed: CalendarEventSeed): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: seed.title,
      dates: `${seed.startLocal}/${seed.endLocal}`,
      details: [seed.detail, seed.agendaNote].filter(Boolean).join(' '),
      location: seed.location,
      ctz: 'America/Denver',
    });

    if (seed.recurrenceRule) {
      params.set('recur', `RRULE:${seed.recurrenceRule}`);
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  private createIcsLink(seed: CalendarEventSeed): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Town of Wiley//Public Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${seed.slug}@townofwiley.gov`,
      `DTSTAMP:${this.createUtcTimestamp()}`,
      `SUMMARY:${this.escapeIcsText(seed.title)}`,
      `DTSTART;TZID=America/Denver:${seed.startLocal}`,
      `DTEND;TZID=America/Denver:${seed.endLocal}`,
      `LOCATION:${this.escapeIcsText(seed.location)}`,
      `DESCRIPTION:${this.escapeIcsText([seed.detail, seed.agendaNote].filter(Boolean).join(' '))}`,
      seed.recurrenceRule ? `RRULE:${seed.recurrenceRule}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean);

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
  }

  private createGoogleCalendarLinkFromEvent(event: CmsCalendarEvent, end: Date): string {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${this.formatGoogleCalendarDate(new Date(event.start))}/${this.formatGoogleCalendarDate(end)}`,
      details: event.description || this.appCopy().calendarEventFallbackDetail,
      location: event.location || this.appCopy().calendarEventFallbackLocation,
      ctz: 'America/Denver',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  private createIcsLinkFromEvent(event: CmsCalendarEvent, end: Date): string {
    const start = new Date(event.start);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Town of Wiley//Public Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${event.id}@townofwiley.gov`,
      `DTSTAMP:${this.createUtcTimestamp()}`,
      `SUMMARY:${this.escapeIcsText(event.title)}`,
      `DTSTART:${this.formatUtcIcsDate(start)}`,
      `DTEND:${this.formatUtcIcsDate(end)}`,
      `LOCATION:${this.escapeIcsText(event.location || this.appCopy().calendarEventFallbackLocation)}`,
      `DESCRIPTION:${this.escapeIcsText(event.description || this.appCopy().calendarEventFallbackDetail)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
  }

  private resolveCalendarEventEnd(event: CmsCalendarEvent): Date {
    if (event.end) {
      const explicitEnd = new Date(event.end);

      if (!Number.isNaN(explicitEnd.getTime())) {
        return explicitEnd;
      }
    }

    const defaultEnd = new Date(event.start);
    defaultEnd.setHours(defaultEnd.getHours() + 1);

    return defaultEnd;
  }

  private formatCalendarEventDate(start: Date, end: Date): string {
    const formatter =
      this.siteLanguage() === 'es'
        ? new Intl.DateTimeFormat('es-US', {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          });

    const endFormatter =
      this.siteLanguage() === 'es'
        ? new Intl.DateTimeFormat('es-US', { hour: 'numeric', minute: '2-digit' })
        : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${formatter.format(start)} - ${endFormatter.format(end)}`;
  }

  private formatGoogleCalendarDate(value: Date): string {
    return value
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }

  private formatUtcIcsDate(value: Date): string {
    return value
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }

  private createUtcTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');
  }

  private escapeIcsText(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }
}
