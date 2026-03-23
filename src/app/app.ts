import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LocalizedAiChat } from './ai-chat/localized-ai-chat';
import { getChatbotRuntimeConfig } from './chatbot-config';
import { CmsAdmin } from './cms-admin/cms-admin';
import { CmsAlertBanner, CmsContact, LocalizedCmsContentStore } from './site-cms-content';
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

interface ServiceCard {
  title: string;
  availability: string;
  description: string;
  href: string;
  cta: string;
  isComingSoon?: boolean;
}

interface TransparencyItem {
  title: string;
  detail: string;
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
  calendarGoogleActionLabel: string;
  calendarDownloadActionLabel: string;
  calendarAgendaActionLabel: string;
  calendarActionsAriaLabel: string;
  servicesKicker: string;
  servicesHeading: string;
  transparencyKicker: string;
  transparencyHeading: string;
  accessibilityKicker: string;
  accessibilityHeading: string;
  complianceNote: string;
  contactKicker: string;
  contactHeading: string;
  comingSoonLabel: string;
  footerLinks: NavLink[];
  communityFacts: CommunityFact[];
  navLinks: NavLink[];
  topTasks: TopTask[];
  meetings: MeetingItem[];
  calendarSeeds: CalendarEventSeed[];
  serviceCards: ServiceCard[];
  transparencyItems: TransparencyItem[];
  accessibilityItems: AccessibilityItem[];
  leadershipGroups: LeadershipGroup[];
  searchIndex: SearchItem[];
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
    calendarGoogleActionLabel: 'Add to Google Calendar',
    calendarDownloadActionLabel: 'Download ICS',
    calendarAgendaActionLabel: 'Agenda details',
    calendarActionsAriaLabel: 'Calendar links',
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
    comingSoonLabel: 'Coming Soon',
    footerLinks: [
      { label: 'Accessibility statement', href: '#accessibility' },
      { label: 'Public records and FOIA', href: '#records' },
      { label: 'Meeting notices', href: '#alerts' },
      { label: 'Contact Town Hall', href: '#contact' },
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
      { label: 'Weather', href: '#weather' },
      { label: 'Notices', href: '#alerts' },
      { label: 'Calendar', href: '#calendar' },
      { label: 'Services', href: '#services' },
      { label: 'Records', href: '#records' },
      { label: 'Accessibility', href: '#accessibility' },
      { label: 'Contact', href: '#contact' },
    ],
    topTasks: [
      {
        title: 'Pay utility bill',
        description:
          'Surface water and utility payments immediately so residents are not forced to navigate a deep department structure.',
        href: '#services',
        note: 'Payment links should warn that they open a separate secure payment provider.',
      },
      {
        title: 'Report a street or utility issue',
        description:
          'Give residents a direct path for outages, potholes, drainage concerns, and streetlight issues without relying on phone tag.',
        href: '#services',
        note: 'Residents should be able to submit requests and track status without calling Town Hall.',
      },
      {
        title: 'Find a meeting or agenda',
        description:
          'Put board meetings, notices, agendas, and minutes directly on the homepage for a town where civic information should stay one click away.',
        href: '#alerts',
        note: 'Open meetings information should stay one click away from the homepage.',
      },
      {
        title: 'Request records, permits, or clerk help',
        description:
          'Group routine clerk and permit needs under plain-language labels so residents do not have to guess which office handles the task.',
        href: '#records',
        note: 'Use forms, clear instructions, and document standards that support WCAG 2.1 AA.',
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
        href: '#calendar',
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
        href: '#calendar',
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
        availability: 'Priority service',
        description:
          'Start with utility and routine fee payments, then expand to permits or court-related payments only when the workflows are stable.',
        href: '#contact',
        cta: 'Pay utility bill',
        isComingSoon: true,
      },
      {
        title: 'Street, utility, and property issue reporting',
        availability: 'Self-service',
        description:
          'Focus on a few high-value request types first: utility concerns, potholes, signage, nuisance issues, and public works follow-up.',
        href: '#contact',
        cta: 'Define request categories and status messages',
      },
      {
        title: 'Permits and licenses',
        availability: 'Business-ready',
        description:
          'Provide application steps, document uploads, fee details, and status tracking without making residents or contractors drive in repeatedly.',
        href: '#records',
        cta: 'Map required forms and department routing',
      },
      {
        title: 'Weather, utility, and emergency alerts',
        availability: 'Multi-channel',
        description:
          'Pair website notices with SMS, email, and app notifications so wind, snow, outages, and service disruptions reach residents quickly.',
        href: '#alerts',
        cta: 'Establish alert topics and subscriber controls',
      },
      {
        title: 'Language access for critical services',
        availability: 'Inclusive access',
        description:
          'Start with critical notices, payment help, clerk services, and emergency updates so language access improves the most-used pages first.',
        href: '#accessibility',
        cta: 'Prioritize high-impact pages for translation',
      },
      {
        title: 'Search and document discovery',
        availability: 'Plain-language findability',
        description:
          'Help residents find agendas, forms, ordinances, and services using task-based queries rather than internal government terminology.',
        href: '#search-panel',
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
    searchIndex: [
      {
        title: 'Check weather and active alerts',
        summary:
          'See the latest National Weather Service forecast, wind conditions, and any active alerts for Wiley.',
        category: 'Weather',
        href: '#weather',
        keywords: [
          'weather',
          'forecast',
          'alerts',
          'warning',
          'watch',
          'advisory',
          'wind',
          'snow',
          'temperature',
          'weather.gov',
          'nws',
        ],
      },
      {
        title: 'Pay utility bill',
        summary:
          'Find the secure online payment entry point and disclosure copy for third-party billing.',
        category: 'Payments',
        href: '#services',
        keywords: ['pay bill', 'water bill', 'utility bill', 'payment', 'fees', 'online payment'],
      },
      {
        title: 'Report a pothole, outage, or street issue',
        summary: 'Start a resident request and track the response status.',
        category: 'Service request',
        href: '#services',
        keywords: [
          'report issue',
          'pothole',
          'outage',
          'street',
          'streetlight',
          '311',
          'public works',
        ],
      },
      {
        title: 'City Council Regular Meeting',
        summary:
          'See the recurring 2nd Monday schedule, agenda guidance, and calendar links for the main council meeting.',
        category: 'Meetings',
        href: '#calendar',
        keywords: [
          'city council',
          'regular meeting',
          '2nd monday',
          'second monday',
          '6:00 pm',
          'agenda',
          'wiley town hall',
        ],
      },
      {
        title: 'Find the next town meeting',
        summary: 'Jump to the City Council schedule, agenda guidance, and the calendar section.',
        category: 'Meetings',
        href: '#alerts',
        keywords: [
          'meeting',
          'agenda',
          'minutes',
          'city council',
          '2nd monday',
          'public notice',
          '304 main street',
        ],
      },
      {
        title: 'Open the town calendar',
        summary:
          'See City Council meetings, hearings, deadlines, and community events in one calendar section with add-to-calendar links.',
        category: 'Calendar',
        href: '#calendar',
        keywords: [
          'calendar',
          'events',
          'schedule',
          'deadlines',
          'hearing',
          'community calendar',
          'google calendar',
          'ics',
          'city council',
        ],
      },
      {
        title: 'Request public records',
        summary: 'Locate FOIA forms, records guidance, and response expectations.',
        category: 'Transparency',
        href: '#records',
        keywords: ['foia', 'records', 'public records', 'documents', 'minutes', 'budget'],
      },
      {
        title: 'Check accessibility and language support',
        summary:
          'Read the accessibility commitments, translation priorities, and alternate format pathways.',
        category: 'Accessibility',
        href: '#accessibility',
        keywords: [
          'accessibility',
          'ada',
          'wcag',
          'translation',
          'language access',
          'screen reader',
        ],
      },
      {
        title: 'Contact Town Hall',
        summary:
          'Find office hours, department contacts, official alias emails, and issue escalation points.',
        category: 'Contact',
        href: '#contact',
        keywords: [
          'contact',
          'office hours',
          'phone',
          'town hall',
          'clerk',
          'permits',
          'wiley',
          '719 829 4974',
          'deb.dillon@townofwiley.gov',
          'scott.whitman@townofwiley.gov',
          'stephen.mckitrick@townofwiley.gov',
          'deb dillon',
          'scott whitman',
          'stephen mckitrick',
          'steve mckitrick',
          'julie esgar',
        ],
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
    nwsAlertLinkLabel: 'Abrir pronostico del NWS',
    nwsAlertSummarySingle: '1 alerta activa del NWS para Wiley.',
    nwsAlertSummaryPluralSuffix: 'alertas activas del NWS para Wiley.',
    homepageSectionsAriaLabel: 'Secciones de la pagina principal',
    communityFactsAriaLabel: 'Perfil de Wiley',
    leadershipAriaLabel: 'Directorio de liderazgo del pueblo',
    heroImageAlt:
      'Camino de entrada a Wiley, Colorado, con el letrero del limite de la ciudad junto a la carretera.',
    topTasksKicker: 'Tareas rapidas',
    topTasksHeading: 'Como puedo...',
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
    calendarGoogleActionLabel: 'Agregar a Google Calendar',
    calendarDownloadActionLabel: 'Descargar ICS',
    calendarAgendaActionLabel: 'Detalles de la agenda',
    calendarActionsAriaLabel: 'Enlaces del calendario',
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
    comingSoonLabel: 'Proximamente',
    footerLinks: [
      { label: 'Declaracion de accesibilidad', href: '#accessibility' },
      { label: 'Registros publicos y FOIA', href: '#records' },
      { label: 'Avisos de reuniones', href: '#alerts' },
      { label: 'Contactar al ayuntamiento', href: '#contact' },
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
      { label: 'Clima', href: '#weather' },
      { label: 'Avisos', href: '#alerts' },
      { label: 'Calendario', href: '#calendar' },
      { label: 'Servicios', href: '#services' },
      { label: 'Registros', href: '#records' },
      { label: 'Accesibilidad', href: '#accessibility' },
      { label: 'Contacto', href: '#contact' },
    ],
    topTasks: [
      {
        title: 'Pagar recibo de servicios',
        description:
          'Muestre de inmediato los pagos de agua y servicios para que los residentes no tengan que navegar una estructura profunda por departamentos.',
        href: '#services',
        note: 'Los enlaces de pago deben advertir que abren un proveedor seguro de pago por separado.',
      },
      {
        title: 'Reportar un problema de calle o servicio',
        description:
          'Ofrezca una ruta directa para cortes, baches, drenaje y alumbrado publico sin depender de llamadas repetidas.',
        href: '#services',
        note: 'Los residentes deben poder enviar solicitudes y seguir su estado sin llamar al ayuntamiento.',
      },
      {
        title: 'Encontrar una reunion o agenda',
        description:
          'Ponga reuniones, avisos, agendas y minutas directamente en la pagina principal para que la informacion civica quede a un clic.',
        href: '#alerts',
        note: 'La informacion de reuniones abiertas debe quedar a un solo clic de la pagina principal.',
      },
      {
        title: 'Solicitar registros, permisos o ayuda del secretario',
        description:
          'Agrupe necesidades rutinarias del secretario y permisos con etiquetas sencillas para que los residentes no tengan que adivinar que oficina maneja cada tramite.',
        href: '#records',
        note: 'Use formularios, instrucciones claras y estandares documentales compatibles con WCAG 2.1 AA.',
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
        href: '#calendar',
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
        href: '#calendar',
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
        availability: 'Servicio prioritario',
        description:
          'Empiece con pagos de servicios y cuotas rutinarias, y despues amplie a permisos o pagos judiciales solo cuando los flujos sean estables.',
        href: '#contact',
        cta: 'Pagar recibo de servicios',
        isComingSoon: true,
      },
      {
        title: 'Reporte de calles, servicios y problemas de propiedad',
        availability: 'Autoservicio',
        description:
          'Enfoquese primero en unos cuantos tipos de solicitud de alto valor: servicios, baches, senalizacion, molestias y seguimiento de obras publicas.',
        href: '#contact',
        cta: 'Definir categorias de solicitud y mensajes de estado',
      },
      {
        title: 'Permisos y licencias',
        availability: 'Listo para negocios',
        description:
          'Ofrezca pasos de solicitud, carga de documentos, detalles de cuotas y seguimiento de estado sin obligar a residentes o contratistas a viajar repetidamente.',
        href: '#records',
        cta: 'Mapear formularios requeridos y la ruta departamental',
      },
      {
        title: 'Alertas de clima, servicios y emergencias',
        availability: 'Multicanal',
        description:
          'Combine avisos del sitio con SMS, correo electronico y notificaciones para que viento, nieve, cortes y cambios de servicio lleguen rapido a los residentes.',
        href: '#alerts',
        cta: 'Definir temas de alerta y controles para suscriptores',
      },
      {
        title: 'Acceso en otros idiomas para servicios criticos',
        availability: 'Acceso inclusivo',
        description:
          'Empiece por avisos criticos, ayuda con pagos, servicios de secretaria y actualizaciones de emergencia para mejorar primero las paginas mas usadas.',
        href: '#accessibility',
        cta: 'Priorizar paginas de alto impacto para traduccion',
      },
      {
        title: 'Busqueda y descubrimiento de documentos',
        availability: 'Busqueda en lenguaje sencillo',
        description:
          'Ayude a los residentes a encontrar agendas, formularios, ordenanzas y servicios mediante consultas orientadas a tareas y no a terminologia interna del gobierno.',
        href: '#search-panel',
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
    searchIndex: [
      {
        title: 'Ver clima y alertas activas',
        summary:
          'Revise el pronostico mas reciente del Servicio Nacional de Meteorologia, las condiciones de viento y cualquier alerta activa para Wiley.',
        category: 'Clima',
        href: '#weather',
        keywords: [
          'clima',
          'pronostico',
          'alertas',
          'advertencia',
          'vigilancia',
          'aviso',
          'viento',
          'nieve',
          'temperatura',
          'weather.gov',
          'nws',
        ],
      },
      {
        title: 'Pagar recibo de servicios',
        summary:
          'Encuentre el acceso seguro de pago en linea y la informacion sobre facturacion de terceros.',
        category: 'Pagos',
        href: '#services',
        keywords: ['pagar recibo', 'agua', 'servicios', 'pago', 'cuotas', 'pago en linea'],
      },
      {
        title: 'Reportar un bache, corte o problema de calle',
        summary: 'Inicie una solicitud del residente y de seguimiento a la respuesta.',
        category: 'Solicitud de servicio',
        href: '#services',
        keywords: ['reportar problema', 'bache', 'corte', 'calle', 'alumbrado', 'obras publicas'],
      },
      {
        title: 'Reunion ordinaria del concejo municipal',
        summary:
          'Revise el horario recurrente del segundo lunes, la orientacion sobre agendas y los enlaces del calendario para la reunion principal del concejo.',
        category: 'Reuniones',
        href: '#calendar',
        keywords: [
          'concejo municipal',
          'reunion',
          'segundo lunes',
          'agenda',
          'ayuntamiento de wiley',
        ],
      },
      {
        title: 'Encontrar la proxima reunion del pueblo',
        summary:
          'Vaya al horario del concejo, la orientacion sobre agendas y la seccion del calendario.',
        category: 'Reuniones',
        href: '#alerts',
        keywords: ['reunion', 'agenda', 'minutas', 'concejo', 'segundo lunes', 'aviso publico'],
      },
      {
        title: 'Abrir el calendario del pueblo',
        summary:
          'Vea reuniones del concejo, audiencias, fechas limite y eventos comunitarios en una sola seccion con enlaces para agregar al calendario.',
        category: 'Calendario',
        href: '#calendar',
        keywords: [
          'calendario',
          'eventos',
          'horario',
          'fechas limite',
          'audiencia',
          'google calendar',
          'ics',
          'concejo',
        ],
      },
      {
        title: 'Solicitar registros publicos',
        summary:
          'Localice formularios FOIA, orientacion sobre registros y expectativas de respuesta.',
        category: 'Transparencia',
        href: '#records',
        keywords: [
          'foia',
          'registros',
          'registros publicos',
          'documentos',
          'minutas',
          'presupuesto',
        ],
      },
      {
        title: 'Revisar accesibilidad y apoyo de idioma',
        summary:
          'Lea los compromisos de accesibilidad, las prioridades de traduccion y las rutas para formatos alternativos.',
        category: 'Accesibilidad',
        href: '#accessibility',
        keywords: ['accesibilidad', 'ada', 'wcag', 'traduccion', 'idioma', 'lector de pantalla'],
      },
      {
        title: 'Contactar al ayuntamiento',
        summary:
          'Encuentre horarios, contactos de oficina, correos oficiales y puntos de escalamiento para problemas.',
        category: 'Contacto',
        href: '#contact',
        keywords: [
          'contacto',
          'telefono',
          'ayuntamiento',
          'secretaria',
          'permisos',
          'wiley',
          '719 829 4974',
          'deb dillon',
          'scott whitman',
          'stephen mckitrick',
          'steve mckitrick',
          'julie esgar',
        ],
      },
    ],
  },
};

@Component({
  selector: 'app-root',
  imports: [NgOptimizedImage, LocalizedAiChat, LocalizedWeatherPanel, CmsAdmin],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly chatbotConfig = getChatbotRuntimeConfig();
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');

  protected readonly searchQuery = signal('');
  protected readonly homepageWeatherAlert = signal<HomepageWeatherAlert | null>(null);
  protected readonly currentYear = new Date().getFullYear();
  protected readonly isAdminMode =
    typeof window !== 'undefined' && window.location.pathname.replace(/\/+$/, '') === '/admin';
  protected readonly isProgrammaticChatEnabled =
    this.chatbotConfig.mode === 'api' && Boolean(this.chatbotConfig.apiEndpoint);
  protected readonly heroContent = this.cmsStore.hero;
  protected readonly cmsAlertBanner = this.cmsStore.alertBanner;
  protected readonly pageTitle = computed(() => this.heroContent().title);
  protected readonly notices = this.cmsStore.notices;
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
  protected readonly meetings = computed(() => this.appCopy().meetings);
  protected readonly calendarItems = computed(() =>
    this.appCopy().calendarSeeds.map((seed) => this.createCalendarItem(seed)),
  );
  protected readonly serviceCards = computed(() => this.appCopy().serviceCards);
  protected readonly transparencyItems = computed(() => this.appCopy().transparencyItems);
  protected readonly accessibilityItems = computed(() => this.appCopy().accessibilityItems);
  protected readonly leadershipGroups = computed(() => this.appCopy().leadershipGroups);

  protected focusMainContent(): void {
    queueMicrotask(() => {
      this.mainContent()?.nativeElement.focus();
    });
  }
  protected readonly searchResults = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const searchIndex = this.appCopy().searchIndex;

    if (!query) {
      return searchIndex.slice(0, 4);
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

    this.navigateToHref(firstResult.href);
  }

  protected openSignup(): void {
    this.scrollToFragment('#weather-signup-heading', '#weather');
  }

  protected updateHomepageWeatherAlert(alert: HomepageWeatherAlert | null): void {
    this.homepageWeatherAlert.set(alert);
  }

  protected updateSiteLanguage(value: string): void {
    this.siteLanguageService.setLanguage(value);
  }

  private navigateToHref(href: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (href.startsWith('#')) {
      this.scrollToFragment(href);
      return;
    }

    window.location.assign(href);
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
      window.history.replaceState(window.history.state, '', `#${targetId}`);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }

    queueMicrotask(() => {
      target.focus({ preventScroll: true });
    });
  }

  private createCalendarItem(seed: CalendarEventSeed): CalendarItem {
    const copy = this.appCopy();

    return {
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
          href: '#contact',
        },
        ...(seed.extraActions ?? []),
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
