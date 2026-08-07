/**
 * Go-Live Checklist (before promoting to production):
 * - `ng build --configuration production` with zero warnings; bundle budgets satisfied.
 * - Unit tests (`npm test` / Vitest) and smoke E2E pass on the release candidate.
 * - CMS/runtime config (`__TOW_RUNTIME_CONFIG__`), Amplify env, and secrets verified for prod.
 * - Analytics/monitoring hooks reviewed; SSL and redirects correct for the live domain.
 * - PDFs and static assets published under `public/documents` (and archive links) match clerk uploads.
 */
import { NgOptimizedImage, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import { MegaMenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';

import { DividerModule } from 'primeng/divider';
import { DrawerModule } from 'primeng/drawer';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputTextModule } from 'primeng/inputtext';
import { MegaMenuModule } from 'primeng/megamenu';
import { Ripple } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { filter, map, startWith } from 'rxjs';
import {
  createGoogleCalendarLinkForEvent,
  createGoogleCalendarLinkForSeed,
  createIcsDataUrlForEvent,
  createIcsDataUrlForSeed,
} from './calendar-public-links';
import {
  cmsNoticeFragmentId,
  getCmsNoticeLinkAriaLabel,
  getCmsNoticeRouteLink,
} from './cms-notice-link';
import { AppRouteLink, getAppRouteLink, isPathRegisteredAppRoute } from './internal-route-link';
import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from './leadership-roster-group-ids';
import { GoogleAnalyticsService } from './google-analytics.service';
import { LoggingService } from './logging.service';
import { localizeCmsPublicDocument } from './meeting-documents/localize-public-document';
import { OfflineConnectivityNotifier } from './offline-connectivity.service';
import {
  CmsAlertBanner,
  CmsCalendarEvent,
  CmsContact,
  CmsNotice,
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
} from './site-cms-content';
import { applyAppCopySiteCopyOverrides } from './site-copy-overrides';
import { SiteLanguage, SiteLanguageService } from './site-language';
import { ThisWeekInWileyComponent } from './this-week-in-wiley/this-week-in-wiley.component';
import { WeatherAlertBannerComponent } from './weather-alert-banner/weather-alert-banner.component';
import { HomepageWeatherAlertPrimer } from './weather-panel/homepage-weather-alert-primer';
import {
  LocalizedWeatherPanel,
  type HomepageWeatherAlert,
} from './weather-panel/localized-weather-panel';

interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

interface PrimaryNavLink {
  label: string;
  routerLink: string;
  fragment?: string;
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
  eventId?: string;
  hasLinkedAgenda?: boolean;
  agendaStorageHref?: string;
  /** Default meeting documents / agenda PDFs section (fallback seed rows). */
  agendaPdfHref?: string;
  agendaButtonLabel?: string;
}

interface CalendarAction {
  label: string;
  href: string;
  downloadFileName?: string;
  external?: boolean;
  isAgendaAction?: boolean;
}

interface CalendarItem {
  id: string;
  source: 'live' | 'seed';
  sourceLabel: string;
  isFeatured: boolean;
  sortDate: number;
  startDate: Date;
  endDate: Date;
  title: string;
  date: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  hasLinkedAgenda?: boolean;
  agendaStorageHref?: string;
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

type CalendarTableSortField = 'title' | 'date' | 'category' | 'location' | 'recurrence';

interface CalendarTableState {
  first: number;
  rows: number;
  sortField: CalendarTableSortField | null;
  sortOrder: 1 | -1 | null;
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

interface PolicyItem {
  title: string;
  detail: string;
}

interface PolicyPageCopy {
  kicker: string;
  title: string;
  intro: string;
  items: PolicyItem[];
  lastUpdatedLabel: string;
  lastUpdatedDate: string;
}

export interface LeadershipGroup {
  /**
   * Stable key for `LeadershipRosterEntry.groupId` in Amplify Studio; roster lines on /contact
   * come from AppSync rows for this group.
   */
  groupId: string;
  title: string;
  detail: string;
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
  | 'accessibility'
  | 'privacy'
  | 'terms'
  | 'businesses'
  | 'news'
  | 'payments'
  | 'documents';

type FeatureTitles = Record<FeaturePageId, string>;

interface FeaturePage {
  id: FeaturePageId;
  kicker: string;
  title: string;
  summary: string;
  href: string;
  showOnHomepage: boolean;
}

export interface AppCopy {
  skipLinkLabel: string;
  homeLabel: string;
  primaryNavServicesLabel: string;
  primaryNavMeetingsLabel: string;
  primaryNavDocumentsLabel: string;
  primaryNavPayLabel: string;
  /** Compact header CTA so bill-payers find /pay-bill without hunting menus. */
  headerPayBillLabel: string;
  primaryNavContactLabel: string;
  homepageWeatherKicker: string;
  homepageWeatherHeading: string;
  footerTownInfoHeading: string;
  footerAttestationHeading: string;
  footerAttestationName: string;
  footerAttestationBody: string;
  footerAttestationPhotoAlt: string;
  languageLabel: string;
  languageOptions: Record<SiteLanguage, string>;
  mobileMenuLabel: string;
  /** Visible "Menu" + drawer purpose for label-in-name (WCAG 2.5.3). */
  mobileMenuButtonAriaLabel: string;
  /** Town name + return action for label-in-name on the header logo link. */
  townLogoAriaLabel: string;
  /** Close control in the mobile navigation drawer header. */
  mobileMenuDrawerCloseLabel: string;
  meetingsQuickLinkLabel: string;
  communityCalendarQuickLinkLabel: string;
  siteAlertAriaLabel: string;
  alertHeadline: string;
  alertActionLabel: string;
  nwsAlertLabel: string;
  nwsAlertLinkLabel: string;
  nwsAlertSignupShortLabel: string;
  nwsWeatherAlertDismissLabel: string;
  cmsLoadFallbackMessage: string;
  cmsLoadRetryLabel: string;
  cmsLoadDismissLabel: string;
  nwsAlertSummarySingle: string;
  nwsAlertSummaryPluralSuffix: string;
  homepageSectionsAriaLabel: string;
  communityFactsAriaLabel: string;
  leadershipAriaLabel: string;
  heroAlt: string;
  heroPrimaryActionLabel: string;
  heroSecondaryActionLabel: string;
  topTasksKicker: string;
  topTasksHeading: string;
  topTasksBody: string;
  featureHubKicker: string;
  featureHubHeading: string;
  featureHubBody: string;
  stayInformedKicker: string;
  stayInformedHeading: string;
  stayInformedBody: string;
  viewAllNoticesLabel: string;
  weatherSupportDescription: string;
  siteMetaDescription: string;
  searchKicker: string;
  searchHeading: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchActionLabel: string;
  searchNote: string;
  searchEmptyState: string;
  mobileOnlinePaymentsLabel: string;
  mobileIssueLabel: string;
  mobileRecordsLabel: string;
  mobileWeatherAlertsLabel: string;
  mobileLanguageAccessLabel: string;
  mobileSearchAllServicesLabel: string;
  noticesKicker: string;
  noticesHeading: string;
  noticesEmptyState: string;
  meetingsKicker: string;
  meetingsHeading: string;
  meetingsEmptyState: string;
  meetingsAgendaPdfButtonLabel: string;
  meetingsAgendaLinkedButtonLabel: string;
  meetingsAgendaUnavailableToastSummary: string;
  meetingsAgendaUnavailableToastDetail: string;
  /** Primary-button label when linking to hub from notices-oriented meeting row (fallback data). */
  meetingsDocumentsHubButtonLabel: string;
  meetingsTableAriaLabel: string;
  meetingsColMeeting: string;
  meetingsColWhen: string;
  meetingsColLocation: string;
  meetingsColDetails: string;
  meetingsColActions: string;
  openCalendarLabel: string;
  calendarKicker: string;
  calendarHeading: string;
  calendarCopy: string;
  calendarBridgeLabel: string;
  calendarJumpLabel: string;
  calendarJumpPlaceholder: string;
  calendarJumpCurrentLabel: string;
  calendarHelpButtonLabel: string;
  calendarHelpTitle: string;
  calendarHelpBody: string;
  calendarHelpPointOne: string;
  calendarHelpPointTwo: string;
  calendarHelpPointThree: string;
  calendarHelpCloseLabel: string;
  calendarMonthTabLabel: string;
  calendarListTabLabel: string;
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
  calendarAgendaLinkedActionLabel: string;
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
  accessibilityLastReviewedLabel: string;
  accessibilityLastReviewedDate: string;
  contactKicker: string;
  contactHeading: string;
  contactEmptyState: string;
  contactRosterEmptyState: string;
  contactTownHallTitle: string;
  contactTownHallHours: string;
  backHomeLabel: string;
  /** Document title segment when no route matches (404). */
  notFoundBrowserTitle: string;
  /** Meta description on 404 shell. */
  notFoundMetaDescription: string;
  privacySummary: string;
  termsSummary: string;
  /** Short blurb for /pay-bill in feature index and search metadata. */
  paymentsFeatureSummary: string;
  /** Kicker + summary for /documents SEO (`featurePages`). */
  documentsHubKicker: string;
  documentsFeatureSummary: string;
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
  menuQuickTasksLabel: string;
  menuGovernmentLabel: string;
  menuServicesPermitsLabel: string;
  menuNewsNoticesLabel: string;
  menuWeatherLabel: string;
  menuBusinessCommunityLabel: string;
  menuContactHallLabel: string;
  menuLeadershipLabel: string;
  /** Column heading in the mega menu under menuQuickTasksLabel (services/tasks side). */
  menuQuickTasksServicesColumnLabel: string;
  /** Column heading in the mega menu under menuQuickTasksLabel (weather/calendar side). */
  menuQuickTasksWeatherColumnLabel: string;
  /** Flyout column under Government & Meetings. */
  menuGovernmentMeetingsColumnLabel: string;
  menuGovernmentTownColumnLabel: string;
  /** Flyout column under Services (meetings/documents). */
  menuServicesRelatedColumnLabel: string;
}

export const WEATHER_ALERT_POLICY_COPY: Record<
  SiteLanguage,
  { privacy: PolicyPageCopy; terms: PolicyPageCopy }
> = {
  en: {
    privacy: {
      lastUpdatedLabel: 'Last updated',
      lastUpdatedDate: 'May 6, 2026',
      kicker: 'Privacy',
      title: 'Weather alert privacy notice',
      intro:
        'This notice explains how the Town of Wiley uses the phone numbers and email addresses submitted through the severe weather alert signup form.',
      items: [
        {
          title: 'Information we collect',
          detail:
            'We collect the destination you enter, your preferred language, ZIP code 81092, and any optional name you provide when you request weather alerts.',
        },
        {
          title: 'How the information is used',
          detail:
            'The Town uses this information only to send signup confirmations, severe weather alerts, and alert-management links related to Wiley weather notifications.',
        },
        {
          title: 'Storage and sharing',
          detail:
            'Subscriber data is stored in AWS services that support the weather alert program. The Town does not sell this information or use it for unrelated marketing.',
        },
        {
          title: 'How to remove your information',
          detail:
            'You can unsubscribe at any time from the alert management link after signup. You can also contact Town Hall at (719) 829-4974 for assistance.',
        },
      ],
    },
    terms: {
      lastUpdatedLabel: 'Last updated',
      lastUpdatedDate: 'May 6, 2026',
      kicker: 'SMS Terms',
      title: 'Weather alert SMS terms',
      intro:
        'These terms apply when you sign up for Town of Wiley severe weather alerts by text message.',
      items: [
        {
          title: 'Consent to receive messages',
          detail:
            'By submitting your mobile number, you agree to receive transactional severe weather alerts and signup confirmations for ZIP code 81092.',
        },
        {
          title: 'Message frequency and charges',
          detail:
            'Message frequency varies with National Weather Service activity, confirmation steps, and account changes. Message and data rates may apply.',
        },
        {
          title: 'How to opt out or get help',
          detail:
            'Reply STOP to end text alerts. Reply HELP for help, or contact Town Hall at (719) 829-4974.',
        },
        {
          title: 'Program scope',
          detail:
            'These messages are public-safety and service-impact alerts for Wiley weather conditions. They are not promotional marketing texts.',
        },
      ],
    },
  },
  es: {
    privacy: {
      lastUpdatedLabel: 'Ultima actualizacion',
      lastUpdatedDate: '6 de mayo de 2026',
      kicker: 'Privacidad',
      title: 'Aviso de privacidad para alertas del clima',
      intro:
        'Este aviso explica como el Pueblo de Wiley usa los numeros de telefono y correos electronicos enviados mediante el formulario de alertas de clima severo.',
      items: [
        {
          title: 'Informacion que recopilamos',
          detail:
            'Recopilamos el destino que usted ingresa, su idioma preferido, el codigo postal 81092 y cualquier nombre opcional que proporcione al solicitar alertas del clima.',
        },
        {
          title: 'Como se usa la informacion',
          detail:
            'El Pueblo usa esta informacion solo para enviar confirmaciones de registro, alertas de clima severo y enlaces para administrar alertas relacionadas con notificaciones meteorologicas de Wiley.',
        },
        {
          title: 'Almacenamiento y uso compartido',
          detail:
            'Los datos de suscriptores se almacenan en servicios de AWS que respaldan el programa de alertas del clima. El Pueblo no vende esta informacion ni la usa para mercadotecnia no relacionada.',
        },
        {
          title: 'Como eliminar su informacion',
          detail:
            'Puede cancelar la suscripcion en cualquier momento desde el enlace de administracion de alertas despues del registro. Tambien puede llamar al Ayuntamiento al (719) 829-4974 para obtener ayuda.',
        },
      ],
    },
    terms: {
      lastUpdatedLabel: 'Ultima actualizacion',
      lastUpdatedDate: '6 de mayo de 2026',
      kicker: 'Terminos SMS',
      title: 'Terminos de SMS para alertas del clima',
      intro:
        'Estos terminos se aplican cuando usted se suscribe por mensaje de texto a las alertas de clima severo del Pueblo de Wiley.',
      items: [
        {
          title: 'Consentimiento para recibir mensajes',
          detail:
            'Al enviar su numero celular, usted acepta recibir alertas transaccionales de clima severo y confirmaciones de registro para el codigo postal 81092.',
        },
        {
          title: 'Frecuencia y cargos',
          detail:
            'La frecuencia de mensajes varia segun la actividad del Servicio Nacional de Meteorologia, los pasos de confirmacion y los cambios en su cuenta. Pueden aplicarse tarifas de mensajes y datos.',
        },
        {
          title: 'Como cancelar o pedir ayuda',
          detail:
            'Responda STOP para terminar las alertas por texto. Responda HELP para obtener ayuda, o llame al Ayuntamiento al (719) 829-4974.',
        },
        {
          title: 'Alcance del programa',
          detail:
            'Estos mensajes son alertas de seguridad publica e impacto en servicios por condiciones meteorologicas de Wiley. No son mensajes promocionales.',
        },
      ],
    },
  },
};

function normalizePath(pathname: string): string {
  const pathWithoutHashOrQuery = pathname.split(/[?#]/, 1)[0] ?? pathname;
  const trimmedPath = pathWithoutHashOrQuery.replace(/\/+$/, '');

  return trimmedPath || '/';
}

export const APP_COPY: Record<SiteLanguage, AppCopy> = {
  en: {
    skipLinkLabel: 'Skip to main content',
    homeLabel: 'Home',
    primaryNavServicesLabel: 'Services',
    primaryNavMeetingsLabel: 'Meetings',
    primaryNavDocumentsLabel: 'Meetings & documents',
    primaryNavPayLabel: 'Pay',
    headerPayBillLabel: 'Pay your bill',
    primaryNavContactLabel: 'Contact',
    homepageWeatherKicker: 'Local conditions',
    homepageWeatherHeading: 'Wiley weather',
    footerTownInfoHeading: 'Town Hall',
    footerAttestationHeading: 'About this website',
    footerAttestationName: 'Built by Mayor Steve McKitrick',
    footerAttestationBody:
      'This website was designed and built by Mayor Steve McKitrick on his own time and at his own expense, using open-source tools and free resources wherever possible. Grok from xAI helped throughout — offering guidance and ideas that shaped the site. It is a quiet contribution toward making town information more accessible, transparent, and useful for every resident of Wiley.',
    footerAttestationPhotoAlt: 'Portrait of Mayor Steve McKitrick',
    languageLabel: 'Site language',
    languageOptions: {
      en: 'EN',
      es: 'ES',
    },
    mobileMenuLabel: 'Menu',
    mobileMenuButtonAriaLabel: 'Menu, homepage sections',
    townLogoAriaLabel: 'Town of Wiley, return to homepage',
    mobileMenuDrawerCloseLabel: 'Close menu',
    meetingsQuickLinkLabel: 'Meetings and Calendar',
    communityCalendarQuickLinkLabel: 'Community Calendar',
    siteAlertAriaLabel: 'Town alert banner',
    alertHeadline: 'Severe weather and service alerts for Wiley, 81092',
    alertActionLabel: 'Sign up for text or email alerts',
    nwsAlertLabel: 'National Weather Service Alert',
    nwsAlertLinkLabel: 'Open NWS forecast',
    nwsAlertSignupShortLabel: 'Sign up for alerts',
    nwsWeatherAlertDismissLabel: 'Dismiss weather alert',
    cmsLoadFallbackMessage:
      'Live town content is temporarily unavailable. Showing bundled information until the connection recovers.',
    cmsLoadRetryLabel: 'Try again',
    cmsLoadDismissLabel: 'Dismiss notice',
    nwsAlertSummarySingle: '1 active NWS alert for Wiley.',
    nwsAlertSummaryPluralSuffix: 'active NWS alerts for Wiley.',
    homepageSectionsAriaLabel: 'Homepage sections',
    communityFactsAriaLabel: 'Wiley profile',
    leadershipAriaLabel: 'Town leadership roster',
    heroAlt: 'Road entering Wiley, Colorado, with the Wiley city-limit sign beside the roadway.',
    heroPrimaryActionLabel: 'Explore resident services',
    heroSecondaryActionLabel: 'View meetings and notices',
    topTasksKicker: 'Quick Tasks',
    topTasksHeading: 'How do I...',
    topTasksBody: '',
    // Note: these can now be overridden at runtime via SiteCopy CMS records (keys "topTasksKicker", "topTasksHeading").
    // The component applies getDynamicLabel() for the live values shown to residents.
    featureHubKicker: 'Town features',
    featureHubHeading: 'Open the town section you need',
    featureHubBody: 'Weather, notices, meetings, services, and Town Hall contacts.',
    stayInformedKicker: 'Stay Informed',
    stayInformedHeading: 'Alerts and direct town contact',
    stayInformedBody:
      'Get weather alerts, meeting information, and direct Town Hall contact in one place.',
    viewAllNoticesLabel: 'View all notices',
    weatherSupportDescription: 'Open forecast details and sign up for weather-sensitive updates.',
    siteMetaDescription:
      'Official Town of Wiley website for resident services, weather alerts, meetings, notices, and Town Hall contacts.',
    searchKicker: 'Wiley Search',
    searchHeading: 'Search Wiley services',
    searchLabel: 'Find taxes, meetings, utilities, and issue reporting in one place.',
    searchPlaceholder: 'Search Wiley services… taxes, meetings, utilities',
    searchActionLabel: 'Search',
    searchNote: 'Results update as you type; use the shortcuts below for common tasks.',
    searchEmptyState:
      'No direct match yet. Try taxes, meetings, utilities, weather, or road issues.',
    mobileOnlinePaymentsLabel: 'Online Payments',
    mobileIssueLabel: 'Report Street/Utility Issue',
    mobileRecordsLabel: 'Records & clerk assistance',
    mobileWeatherAlertsLabel: 'Weather & Emergency Alerts',
    mobileLanguageAccessLabel: 'Language Access',
    mobileSearchAllServicesLabel: 'Search All Services',
    noticesKicker: 'Latest Updates',
    noticesHeading: 'News & Announcements',
    noticesEmptyState:
      'No public notices are posted right now. Check back soon, or call Town Hall at (719) 829-4974 for current updates.',
    meetingsKicker: 'Town calendar',
    meetingsHeading: 'Council meetings & schedules',
    meetingsEmptyState:
      'No upcoming meetings are scheduled in the calendar yet. Town Council meets the second Monday of each month at 6:00 PM at Wiley Town Hall.',
    meetingsAgendaPdfButtonLabel: 'View agenda PDFs',
    meetingsAgendaLinkedButtonLabel: 'View agenda',
    meetingsAgendaUnavailableToastSummary: 'Agenda not yet available',
    meetingsAgendaUnavailableToastDetail:
      'The agenda for this meeting has not been posted yet. Please check back later or call Town Hall at (719) 829-4974.',
    meetingsDocumentsHubButtonLabel: 'Browse town documents',
    meetingsTableAriaLabel: 'Upcoming meetings and schedules',
    meetingsColMeeting: 'Meeting',
    meetingsColWhen: 'When',
    meetingsColLocation: 'Location',
    meetingsColDetails: 'Details',
    meetingsColActions: 'Actions',
    openCalendarLabel: 'Open the full town calendar',
    calendarKicker: 'Calendar',
    calendarHeading: 'Public calendar',
    calendarCopy: 'View the latest town meetings, agendas, and community events for Wiley.',
    calendarBridgeLabel: 'Notices, agendas, and meeting materials',
    calendarJumpLabel: 'Jump to a month',
    calendarJumpPlaceholder: 'Choose a month',
    calendarJumpCurrentLabel: 'Selected month:',
    calendarHelpButtonLabel: 'Calendar help',
    calendarHelpTitle: 'Using the calendar',
    calendarHelpBody:
      'Select a month to focus the grid; event cards below show the current schedule and links.',
    calendarHelpPointOne: 'Choose a month to shift the calendar view.',
    calendarHelpPointTwo: 'Open event cards for agendas, downloads, and details.',
    calendarHelpPointThree: 'Check Town notices for cancellations or room changes.',
    calendarHelpCloseLabel: 'Close help',
    calendarMonthTabLabel: 'Month view',
    calendarListTabLabel: 'Event list',
    calendarStatusAriaLabel: 'Calendar publishing status',
    calendarStatusKicker: 'Publishing status',
    calendarStatusLiveSummarySingular: 'upcoming event',
    calendarStatusLiveSummaryPlural: 'upcoming events',
    calendarStatusLiveDetail:
      'These calendar cards show the latest meeting and community event information for Wiley.',
    calendarStatusFallbackSummary: 'Recurring town schedule',
    calendarStatusFallbackDetail:
      "The calendar below lists Wiley's regular meetings and community events.",
    calendarStatusNextLabel: 'Next upcoming event',
    calendarStatusFallbackNextLabel: 'Next scheduled meeting',
    calendarManagedBadge: 'Updated event',
    calendarFallbackBadge: 'Regular schedule',
    calendarFeaturedBadge: 'Next up',
    calendarPublishedEventCategory: 'Upcoming event',
    calendarGoogleActionLabel: 'Add to Google Calendar',
    calendarDownloadActionLabel: 'Download ICS',
    calendarAgendaActionLabel: 'View agenda PDFs',
    calendarAgendaLinkedActionLabel: 'View agenda',
    calendarActionsAriaLabel: 'Calendar links',
    calendarLiveEventCategory: 'Community calendar',
    calendarScheduledEventLabel: 'Scheduled event',
    calendarEventFallbackDetail:
      'Meeting details and community event information will appear here.',
    calendarEventFallbackLocation: 'Wiley, Colorado',
    servicesKicker: 'Digital Services',
    servicesHeading: 'Online services for residents',
    transparencyKicker: 'Transparency',
    transparencyHeading: 'Town notices and meeting materials',
    accessibilityKicker: 'Accessibility',
    accessibilityHeading: 'Accessible services and inclusive design',
    complianceNote:
      'Read our accessibility statement, request alternate formats, and report barriers to town staff.',
    accessibilityLastReviewedLabel: 'Last reviewed',
    accessibilityLastReviewedDate: 'May 6, 2026',
    contactKicker: 'Contact',
    contactHeading: 'Phone, email, and next steps',
    contactEmptyState:
      'Town Hall directory is loading. If contacts do not appear, call (719) 829-4974 or email the Town Clerk for help.',
    contactRosterEmptyState: 'No officials listed yet.',
    contactTownHallTitle: 'Wiley Town Hall',
    contactTownHallHours: 'Monday – Friday · 8:00 AM – 4:00 PM',
    backHomeLabel: 'Return to homepage',
    notFoundBrowserTitle: 'Page not found',
    notFoundMetaDescription:
      'That page is not on this site. Use the homepage or resident services to find what you need.',
    privacySummary:
      'How the Town of Wiley uses contact information from the weather alert signup form.',
    termsSummary:
      'Message frequency, opt-out instructions, and program terms for Wiley weather alert texts.',
    paymentsFeatureSummary:
      'Hosted Paystar Quick Pay when available, plus a billing assistance form and Town Hall support.',
    documentsHubKicker: 'Meeting documents',
    documentsFeatureSummary: 'Meeting agendas and approved minutes published by the Town of Wiley.',
    featureTitles: {
      weather: 'Local weather',
      notices: 'Town notices',
      meetings: 'Meetings and calendar',
      services: 'Resident services',
      records: 'Meetings & documents',
      contact: 'Contact Town Hall',
      accessibility: 'Accessibility statement',
      privacy: 'Weather alert privacy notice',
      terms: 'Weather alert SMS terms',
      businesses: 'Business directory',
      news: 'Town news',
      payments: 'Utility bill payment',
      documents: 'Public documents hub',
    },
    footerLinks: [
      { label: 'Accessibility statement', href: '/accessibility' },
      { label: 'Weather alert privacy', href: '/privacy' },
      { label: 'Weather alert SMS terms', href: '/terms' },
      { label: 'Contact the Town Clerk', href: '/contact' },
      { label: 'Meeting notices', href: '/meetings' },
      { label: 'Contact Town Hall', href: '/contact' },
    ],
    communityFacts: [
      { label: 'Population', value: '~437', detail: 'Estimated residents, 2020 census' },
      { label: 'County', value: 'Prowers', detail: 'Eastern Colorado' },
      { label: 'Elevation', value: '3,563 ft', detail: 'Above sea level' },
      { label: 'Founded', value: '1910', detail: 'Incorporated town' },
      { label: 'ZIP Code', value: '81092', detail: 'Wiley postal area' },
    ],
    navLinks: [
      { label: 'Top Tasks', href: '#top-tasks', icon: 'pi pi-list' },
      { label: 'Weather', href: '/weather', icon: 'pi pi-cloud' },
      { label: 'Notices', href: '/notices', icon: 'pi pi-bell' },
      { label: 'Meetings', href: '/meetings', icon: 'pi pi-calendar' },
      { label: 'Services', href: '/services', icon: 'pi pi-briefcase' },
      { label: 'Meetings', href: '/meetings', icon: 'pi pi-calendar' },
      { label: 'Accessibility', href: '/accessibility', icon: 'pi pi-eye' },
      { label: 'Businesses', href: '/businesses', icon: 'pi pi-building' },
      { label: 'News', href: '/news', icon: 'pi pi-newspaper' },
      { label: 'Contact', href: '/contact', icon: 'pi pi-envelope' },
    ],
    menuQuickTasksLabel: 'I Want To...',
    menuGovernmentLabel: 'Government & Meetings',
    menuServicesPermitsLabel: 'Services',
    menuNewsNoticesLabel: 'News, Notices & Alerts',
    menuWeatherLabel: 'Weather',
    menuBusinessCommunityLabel: 'Businesses & Community',
    menuContactHallLabel: 'Contact & Town Hall',
    menuLeadershipLabel: 'Leadership',
    menuQuickTasksServicesColumnLabel: 'Popular shortcuts',
    menuQuickTasksWeatherColumnLabel: 'Weather & calendar',
    menuGovernmentMeetingsColumnLabel: 'Meetings & records',
    menuGovernmentTownColumnLabel: 'Town information',
    menuServicesRelatedColumnLabel: 'Meetings & documents',
    topTasks: [
      {
        title: 'Pay utility bill',
        description: 'Pay your water and utility bills online or find payment options.',
        href: '/pay-bill',
        note: 'Contact Town Hall for payment assistance.',
      },
      {
        title: 'Report a street or utility issue',
        description: 'Report potholes, outages, drainage issues, or streetlight problems.',
        href: '/services#issue-report',
        note: 'Submit your report directly to town services.',
      },
      {
        title: 'Find a meeting or agenda',
        description: 'View upcoming meetings, agendas, and past minutes.',
        href: '/meetings',
        note: 'All meeting information is available here.',
      },
      {
        title: 'Browse the Community Calendar',
        description: 'See yard sales, school events, fundraisers, and other community gatherings.',
        href: '/meetings#community',
        note: 'Residents can also submit events for Clerk review.',
      },
      {
        title: 'Contact the Town Clerk',
        description: 'Email clerk@townofwiley.gov for records or clerk assistance.',
        href: '/contact',
        note: 'Call Town Hall at (719) 829-4974 if you need help right away.',
      },
    ],
    meetings: [
      {
        title: 'Town council meeting',
        schedule: 'Second Monday each month · 6:00 PM',
        format: 'In person at Wiley Town Hall. Agendas post before each meeting.',
        location: 'Wiley Town Hall, 304 Main Street',
        agendaNote: 'Agenda requests: (719) 829-4974 or the town clerk before the meeting.',
      },
      {
        title: 'Town notices & deadlines',
        schedule: 'Posted year-round',
        format: 'Utility work, road closures, seasonal deadlines, and severe weather updates.',
        location: 'Town-wide',
        cta: 'Browse notices',
        href: '/notices',
      },
    ],
    calendarSeeds: [
      {
        title: 'City Council Regular Meeting',
        dateLabel: 'Every 2nd Monday, 6:00 PM',
        category: 'City Council',
        detail:
          'Each month, find agendas, minutes, livestream links, and accessible meeting materials for Wiley Town Council. Updates include cancellations, room changes, and how to take part.',
        location: 'Wiley Town Hall, 304 Main Street',
        recurrence: 'Recurring monthly',
        agendaNote:
          'Agenda requests: (719) 829-4974 or deb.dillon@townofwiley.gov before the meeting.',
        startLocal: '20260511T180000',
        endLocal: '20260511T190000',
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
        title: 'Town notices & deadlines',
        dateLabel: 'Community reminders and service notices',
        category: 'Community calendar',
        detail:
          'Town reminders include seasonal deadlines, planned closures, utility work, school-related notices when applicable, and severe weather alerts.',
        location: 'Town-wide',
        recurrence: 'Operational updates',
        startLocal: '20260602T080000',
        endLocal: '20260602T090000',
        slug: 'community-deadlines-service-updates',
      },
    ],
    serviceCards: [
      {
        title: 'Pay your utility bill online',
        availability: 'Online payments and billing support',
        description:
          'Pay online through the utility billing portal, or contact Town Hall for balance and payment options.',
        href: '/pay-bill',
        cta: 'Open utility payment options',
      },
      {
        title: 'Report a street or utility problem',
        availability: 'Self-service',
        description:
          'To report a pothole, water or sewer issue, streetlight outage, drainage concern, or nuisance, use the issue report form. Your submission goes directly to the Town Superintendent for follow-up.',
        href: '/services#issue-report',
        cta: 'Open issue report form',
      },
      {
        title: 'Contact the Town Clerk',
        availability: 'Contact Town Clerk',
        description: 'Email clerk@townofwiley.gov for records and document requests.',
        href: '/contact',
        cta: 'Contact the Town Clerk',
      },
      {
        title: 'Sign up for weather and emergency alerts',
        availability: 'Multi-channel',
        description:
          'To receive severe weather warnings and emergency notices by text, go to the weather page and enter your phone number in the alert sign-up. You can unsubscribe any time.',
        href: '/weather',
        cta: 'Sign up for weather alerts',
      },
      {
        title: 'Access the site in Spanish',
        availability: 'Inclusive access',
        description:
          'To switch the site to Spanish, use the language toggle at the top of any page. If you need interpreter assistance for a town service, call Town Hall and staff will help.',
        href: '/accessibility',
        cta: 'View accessibility and language options',
      },
      {
        title: 'Find meeting agendas and minutes',
        availability: 'Plain-language search',
        description:
          'Search the homepage for meeting agendas and approved minutes, or open the Meetings page.',
        href: '/meetings',
        cta: 'Open meetings and documents',
      },
    ],
    transparencyItems: [
      {
        title: 'Public records and clerk assistance',
        detail:
          'Email clerk@townofwiley.gov for public records or document requests. The Town Clerk will reply with next steps.',
      },
      {
        title: 'Agendas and approved minutes',
        detail:
          'Meeting agendas and approved minutes are posted on the Meetings page when available.',
      },
      {
        title: 'Town notices and deadlines',
        detail:
          'Notices and service updates cover road work, utility projects, closures, and major town operations.',
      },
    ],
    transparencyActionsLabel: 'Transparency quick actions',
    transparencyActions: [
      {
        title: 'Email the Town Clerk',
        detail: 'Public records and document requests: clerk@townofwiley.gov',
        href: 'mailto:clerk@townofwiley.gov',
      },
      {
        title: 'Meeting agendas and minutes',
        detail: 'Browse posted meeting documents on the Meetings page.',
        href: '/meetings',
      },
    ],
    accessibilityItems: [
      {
        title: 'Keyboard and screen-reader support',
        detail:
          'This site uses logical headings, a skip link, visible focus, and consistent navigation.',
      },
      {
        title: 'Readable contrast and resize behavior',
        detail:
          'Text is published to meet WCAG 2.1 AA contrast; layouts support zoom and larger text settings.',
      },
      {
        title: 'Accessible documents and media',
        detail:
          'Public PDFs, video, and downloads are provided with accessibility in mind; contact the clerk for alternate formats.',
      },
      {
        title: 'Feedback and ongoing improvement',
        detail:
          'Use the accessibility statement to request accommodations or report barriers; the town reviews feedback on a recurring basis.',
      },
    ],
    leadershipGroups: [
      {
        groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
        title: 'Elected Officials (Mayor & Council)',
        detail: 'Elected officials and meeting contact paths are listed below.',
      },
      {
        groupId: LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
        title: 'Town Administration',
        detail: 'Clerk and superintendent contacts for day-to-day town services.',
      },
    ],
  },
  es: {
    skipLinkLabel: 'Saltar al contenido principal',
    homeLabel: 'Inicio',
    primaryNavServicesLabel: 'Servicios',
    primaryNavMeetingsLabel: 'Reuniones',
    primaryNavDocumentsLabel: 'Reuniones y documentos',
    primaryNavPayLabel: 'Pagar',
    headerPayBillLabel: 'Pagar su factura',
    primaryNavContactLabel: 'Contacto',
    homepageWeatherKicker: 'Condiciones locales',
    homepageWeatherHeading: 'Clima en Wiley',
    footerTownInfoHeading: 'Ayuntamiento',
    footerAttestationHeading: 'Acerca de este sitio web',
    footerAttestationName: 'Creado por el alcalde Steve McKitrick',
    footerAttestationBody:
      'Este sitio web fue disenado y creado por el alcalde Steve McKitrick en su tiempo libre y con recursos propios, usando herramientas de codigo abierto y recursos gratuitos siempre que fue posible. Grok de xAI ayudo en todo el proceso — con orientacion e ideas que dieron forma al sitio. Es una contribucion discreta para que la informacion del pueblo sea mas accesible, transparente y util para cada residente de Wiley.',
    footerAttestationPhotoAlt: 'Retrato del alcalde Steve McKitrick',
    languageLabel: 'Idioma del sitio',
    languageOptions: {
      en: 'EN',
      es: 'ES',
    },
    mobileMenuLabel: 'Menu',
    mobileMenuButtonAriaLabel: 'Menu, secciones de la pagina principal',
    townLogoAriaLabel: 'Pueblo de Wiley, volver a la pagina principal',
    mobileMenuDrawerCloseLabel: 'Cerrar menú',
    meetingsQuickLinkLabel: 'Reuniones y calendario',
    communityCalendarQuickLinkLabel: 'Calendario comunitario',
    siteAlertAriaLabel: 'Banner de alerta del pueblo',
    alertHeadline: 'Alertas de clima severo y servicios para Wiley, 81092',
    alertActionLabel: 'Inscribirse para alertas por texto o correo',
    nwsAlertLabel: 'Alerta del Servicio Nacional de Meteorologia',
    nwsAlertLinkLabel: 'Abrir pronostico del SMN',
    nwsAlertSignupShortLabel: 'Inscribirse para alertas',
    nwsWeatherAlertDismissLabel: 'Cerrar alerta meteorologica',
    cmsLoadFallbackMessage:
      'El contenido en vivo del pueblo no esta disponible temporalmente. Mostrando informacion incluida hasta que se recupere la conexion.',
    cmsLoadRetryLabel: 'Intentar de nuevo',
    cmsLoadDismissLabel: 'Cerrar aviso',
    nwsAlertSummarySingle: '1 alerta activa del NWS para Wiley.',
    nwsAlertSummaryPluralSuffix: 'alertas activas del NWS para Wiley.',
    homepageSectionsAriaLabel: 'Secciones de la pagina principal',
    communityFactsAriaLabel: 'Perfil de Wiley',
    leadershipAriaLabel: 'Directorio de liderazgo del pueblo',
    heroAlt:
      'Carretera de entrada a Wiley, Colorado, con el letrero de limites del pueblo junto a la via.',
    heroPrimaryActionLabel: 'Explorar servicios para residentes',
    heroSecondaryActionLabel: 'Ver reuniones y avisos',
    topTasksKicker: 'Tareas rapidas',
    topTasksHeading: 'Como puedo...',
    topTasksBody: '',
    featureHubKicker: 'Funciones del pueblo',
    featureHubHeading: 'Abra la seccion del pueblo que necesita',
    featureHubBody: 'Clima, avisos, reuniones, servicios, registros y contactos del Ayuntamiento.',
    stayInformedKicker: 'Manténgase Informado',
    stayInformedHeading: 'Alertas y contacto directo con el ayuntamiento',
    stayInformedBody:
      'Obtenga alertas meteorológicas, información de reuniones y contacto directo con el Ayuntamiento en un solo lugar.',
    viewAllNoticesLabel: 'Ver todos los avisos',
    weatherSupportDescription:
      'Abra los detalles del pronóstico y regístrese para actualizaciones sensibles al clima.',
    siteMetaDescription:
      'Sitio web oficial del Pueblo de Wiley para servicios a residentes, alertas del clima, reuniones, registros, avisos y contactos del ayuntamiento.',
    searchKicker: 'Busqueda de Wiley',
    searchHeading: 'Busque servicios de Wiley',
    searchLabel: 'Encuentre impuestos, reuniones, servicios publicos y reportes en un solo lugar.',
    searchPlaceholder: 'Busque servicios de Wiley… impuestos, reuniones, servicios',
    searchActionLabel: 'Buscar',
    searchNote:
      'Los resultados se actualizan al escribir; use los accesos directos abajo para tareas comunes.',
    searchEmptyState:
      'Todavia no hay coincidencia directa. Pruebe impuestos, reuniones, servicios, clima o calles.',
    mobileOnlinePaymentsLabel: 'Pagos en linea',
    mobileIssueLabel: 'Reportar problema de calle o servicio',
    mobileRecordsLabel: 'Registros y ayuda de la secretaria',
    mobileWeatherAlertsLabel: 'Alertas de clima y emergencia',
    mobileLanguageAccessLabel: 'Acceso en espanol',
    mobileSearchAllServicesLabel: 'Buscar todos los servicios',
    noticesKicker: 'Novedades',
    noticesHeading: 'Noticias y anuncios',
    noticesEmptyState:
      'No hay avisos publicos en este momento. Vuelva pronto o llame al Ayuntamiento al (719) 829-4974 para conocer las actualizaciones.',
    meetingsKicker: 'Calendario municipal',
    meetingsHeading: 'Reuniones del concejo y cronograma',
    meetingsEmptyState:
      'Aun no hay reuniones programadas en el calendario. El Concejo se reune el segundo lunes de cada mes a las 6:00 PM en el Ayuntamiento de Wiley.',
    meetingsAgendaPdfButtonLabel: 'Ver PDFs de la agenda',
    meetingsAgendaLinkedButtonLabel: 'Ver agenda',
    meetingsAgendaUnavailableToastSummary: 'La agenda aun no esta disponible',
    meetingsAgendaUnavailableToastDetail:
      'La agenda de esta reunion aun no se ha publicado. Vuelva mas tarde o llame al Ayuntamiento al (719) 829-4974.',
    meetingsDocumentsHubButtonLabel: 'Ver documentos del pueblo',
    meetingsTableAriaLabel: 'Próximas reuniones y horarios',
    meetingsColMeeting: 'Reunión',
    meetingsColWhen: 'Cuándo',
    meetingsColLocation: 'Ubicación',
    meetingsColDetails: 'Detalles',
    meetingsColActions: 'Acciones',
    openCalendarLabel: 'Abrir el calendario completo del pueblo',
    calendarKicker: 'Calendario',
    calendarHeading: 'Calendario publico',
    calendarCopy:
      'Vea las últimas reuniones del pueblo, agendas y eventos comunitarios para Wiley.',
    calendarBridgeLabel: 'Avisos, agendas y documentos de reunion',
    calendarJumpLabel: 'Ir a un mes',
    calendarJumpPlaceholder: 'Elija un mes',
    calendarJumpCurrentLabel: 'Mes seleccionado:',
    calendarHelpButtonLabel: 'Ayuda del calendario',
    calendarHelpTitle: 'Uso del calendario',
    calendarHelpBody:
      'Seleccione un mes para enfocar la cuadricula; las tarjetas abajo muestran el horario actual y enlaces.',
    calendarHelpPointOne: 'Elija un mes para cambiar la vista del calendario.',
    calendarHelpPointTwo: 'Abra las tarjetas de eventos para agendas, descargas y detalles.',
    calendarHelpPointThree: 'Consulte los avisos del pueblo por cancelaciones o cambios de sala.',
    calendarHelpCloseLabel: 'Cerrar ayuda',
    calendarMonthTabLabel: 'Vista mensual',
    calendarListTabLabel: 'Lista de eventos',
    calendarStatusAriaLabel: 'Estado de publicacion del calendario',
    calendarStatusKicker: 'Estado de publicacion',
    calendarStatusLiveSummarySingular: 'proximo evento',
    calendarStatusLiveSummaryPlural: 'proximos eventos',
    calendarStatusLiveDetail:
      'Estas tarjetas del calendario muestran la informacion mas reciente sobre reuniones y eventos comunitarios de Wiley.',
    calendarStatusFallbackSummary: 'Horario recurrente del pueblo',
    calendarStatusFallbackDetail:
      'El calendario a continuacion muestra las reuniones regulares y los eventos comunitarios del pueblo.',
    calendarStatusNextLabel: 'Proximo evento',
    calendarStatusFallbackNextLabel: 'Proxima reunion programada',
    calendarManagedBadge: 'Evento actualizado',
    calendarFallbackBadge: 'Horario regular',
    calendarFeaturedBadge: 'Sigue',
    calendarPublishedEventCategory: 'Proximo evento',
    calendarGoogleActionLabel: 'Agregar a Google Calendar',
    calendarDownloadActionLabel: 'Descargar ICS',
    calendarAgendaActionLabel: 'Ver PDFs de la agenda',
    calendarAgendaLinkedActionLabel: 'Ver agenda',
    calendarActionsAriaLabel: 'Enlaces del calendario',
    calendarLiveEventCategory: 'Calendario comunitario',
    calendarScheduledEventLabel: 'Evento programado',
    calendarEventFallbackDetail:
      'Los detalles de reuniones y eventos comunitarios apareceran aqui.',
    calendarEventFallbackLocation: 'Wiley, Colorado',
    servicesKicker: 'Servicios digitales',
    servicesHeading: 'Servicios en linea para residentes',
    transparencyKicker: 'Transparencia',
    transparencyHeading: 'Registros publicos, presupuestos y avisos',
    accessibilityKicker: 'Accesibilidad',
    accessibilityHeading: 'Servicios accesibles y diseno inclusivo',
    complianceNote:
      'Lea nuestra declaracion de accesibilidad, solicite formatos alternativos e informe barreras al personal.',
    accessibilityLastReviewedLabel: 'Ultima revision',
    accessibilityLastReviewedDate: '6 de mayo de 2026',
    contactKicker: 'Contacto',
    contactHeading: 'Telefono, correo y siguientes pasos',
    contactEmptyState:
      'El directorio del Ayuntamiento esta cargando. Si los contactos no aparecen, llame al (719) 829-4974 o escriba a la Secretaria del Pueblo.',
    contactRosterEmptyState: 'Aun no hay funcionarios en esta lista.',
    contactTownHallTitle: 'Ayuntamiento de Wiley',
    contactTownHallHours: 'Lunes a viernes · 8:00 a. m. – 4:00 p. m.',
    backHomeLabel: 'Volver a la página principal',
    notFoundBrowserTitle: 'Página no encontrada',
    notFoundMetaDescription:
      'Esa página no está en este sitio. Use la página principal o los servicios para residentes.',
    privacySummary:
      'Como usa el Pueblo de Wiley la informacion de contacto del formulario de alertas del clima.',
    termsSummary:
      'Frecuencia de mensajes, instrucciones para cancelar y terminos del programa de alertas por texto de Wiley.',
    paymentsFeatureSummary:
      'Pago rapido Paystar alojado cuando este activo, mas formulario de ayuda con facturacion y apoyo del Ayuntamiento.',
    documentsHubKicker: 'Documentos de reuniones',
    documentsFeatureSummary:
      'Agendas de reuniones y minutas aprobadas publicadas por el Pueblo de Wiley.',
    featureTitles: {
      weather: 'Clima local',
      notices: 'Avisos del pueblo',
      meetings: 'Reuniones y calendario',
      services: 'Servicios para residentes',
      records: 'Reuniones y documentos',
      contact: 'Contactar al ayuntamiento',
      accessibility: 'Declaracion de accesibilidad',
      privacy: 'Aviso de privacidad para alertas del clima',
      terms: 'Terminos de SMS para alertas del clima',
      businesses: 'Directorio de negocios',
      news: 'Noticias del pueblo',
      payments: 'Pago de factura de servicios',
      documents: 'Documentos publicos',
    },
    footerLinks: [
      { label: 'Declaracion de accesibilidad', href: '/accessibility' },
      { label: 'Privacidad de alertas del clima', href: '/privacy' },
      { label: 'Terminos SMS de alertas del clima', href: '/terms' },
      { label: 'Contactar a la secretaria', href: '/contact' },
      { label: 'Avisos de reuniones', href: '/meetings' },
      { label: 'Contactar al ayuntamiento', href: '/contact' },
    ],
    communityFacts: [
      { label: 'Poblacion', value: '~437', detail: 'Residentes estimados, censo de 2020' },
      { label: 'Condado', value: 'Prowers', detail: 'Este de Colorado' },
      { label: 'Elevacion', value: '3,563 pies', detail: 'Sobre el nivel del mar' },
      { label: 'Fundado en', value: '1910', detail: 'Pueblo incorporado' },
      { label: 'Codigo postal', value: '81092', detail: 'Area postal de Wiley' },
    ],
    navLinks: [
      { label: 'Tareas clave', href: '#top-tasks', icon: 'pi pi-list' },
      { label: 'Clima', href: '/weather', icon: 'pi pi-cloud' },
      { label: 'Avisos', href: '/notices', icon: 'pi pi-bell' },
      { label: 'Reuniones', href: '/meetings', icon: 'pi pi-calendar' },
      { label: 'Servicios', href: '/services', icon: 'pi pi-briefcase' },
      { label: 'Reuniones', href: '/meetings', icon: 'pi pi-calendar' },
      { label: 'Negocios', href: '/businesses', icon: 'pi pi-building' },
      { label: 'Noticias', href: '/news', icon: 'pi pi-newspaper' },
      { label: 'Contacto', href: '/contact', icon: 'pi pi-envelope' },
    ],
    menuQuickTasksLabel: 'Quiero...',
    menuGovernmentLabel: 'Gobierno y Reuniones',
    menuServicesPermitsLabel: 'Servicios',
    menuNewsNoticesLabel: 'Noticias, Avisos y Alertas',
    menuWeatherLabel: 'Clima',
    menuBusinessCommunityLabel: 'Negocios y Comunidad',
    menuContactHallLabel: 'Contacto y Ayuntamiento',
    menuLeadershipLabel: 'Liderazgo',
    menuQuickTasksServicesColumnLabel: 'Atajos populares',
    menuQuickTasksWeatherColumnLabel: 'Clima y calendario',
    menuGovernmentMeetingsColumnLabel: 'Reuniones y registros',
    menuGovernmentTownColumnLabel: 'Información del pueblo',
    menuServicesRelatedColumnLabel: 'Reuniones y documentos',
    topTasks: [
      {
        title: 'Pagar recibo de servicios',
        description: 'Pague sus recibos de agua y servicios en línea o encuentre opciones de pago.',
        href: '/pay-bill',
        note: 'Contacte al Ayuntamiento para asistencia con pagos.',
      },
      {
        title: 'Reportar un problema de calle o servicio',
        description: 'Reportar baches, cortes, problemas de drenaje o alumbrado público.',
        href: '/services#issue-report',
        note: 'Envíe su reporte directamente a los servicios del pueblo.',
      },
      {
        title: 'Encontrar una reunión o agenda',
        description: 'Ver reuniones próximas, agendas y minutas pasadas.',
        href: '/meetings',
        note: 'Toda la información de reuniones está disponible aquí.',
      },
      {
        title: 'Ver el calendario comunitario',
        description:
          'Vea ventas de garaje, eventos escolares, recaudaciones y otras reuniones comunitarias.',
        href: '/meetings#community',
        note: 'Los residentes también pueden enviar eventos para revisión de la secretaria.',
      },
      {
        title: 'Contactar a la secretaria del pueblo',
        description: 'Escriba a clerk@townofwiley.gov para registros o ayuda de la secretaria.',
        href: '/contact',
        note: 'Llame al Ayuntamiento al (719) 829-4974 si necesita ayuda de inmediato.',
      },
    ],
    meetings: [
      {
        title: 'Reunion del concejo municipal',
        schedule: 'Segundo lunes de cada mes · 6:00 PM',
        format:
          'Presencial en el ayuntamiento de Wiley. Las agendas se publican antes de cada reunion.',
        location: 'Ayuntamiento de Wiley, 304 Main Street',
        agendaNote: 'Solicitudes de agenda: (719) 829-4974 o el secretario antes de la reunion.',
      },
      {
        title: 'Avisos y fechas limite del pueblo',
        schedule: 'Segun se publique',
        format:
          'Trabajos en servicios, cierres de calles, fechas limite estacionales y alertas meteorologicas.',
        location: 'Todo el pueblo',
        cta: 'Ver avisos',
        href: '/notices',
      },
    ],
    calendarSeeds: [
      {
        title: 'Reunion ordinaria del concejo municipal',
        dateLabel: 'Cada segundo lunes, 6:00 PM',
        category: 'Concejo municipal',
        detail:
          'Cada mes encontrara agendas, minutas, enlaces de transmision y materiales accesibles para el Concejo municipal de Wiley. Los avisos incluyen cancelaciones, cambios de sala y como participar.',
        location: 'Ayuntamiento de Wiley, 304 Main Street',
        recurrence: 'Recurrente cada mes',
        agendaNote:
          'Solicitudes de agenda: (719) 829-4974 o deb.dillon@townofwiley.gov antes de la reunion.',
        startLocal: '20260511T180000',
        endLocal: '20260511T190000',
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
        title: 'Avisos y fechas limite del pueblo',
        dateLabel: 'Recordatorios comunitarios y avisos de servicios',
        category: 'Calendario comunitario',
        detail:
          'Los recordatorios del pueblo incluyen fechas limite estacionales, cierres planificados, trabajos en servicios publicos, avisos relacionados con las escuelas cuando aplique y alertas meteorologicas.',
        location: 'Todo el pueblo',
        recurrence: 'Actualizaciones operativas',
        startLocal: '20260602T080000',
        endLocal: '20260602T090000',
        slug: 'community-deadlines-service-updates',
      },
    ],
    serviceCards: [
      {
        title: 'Pague su factura de servicios en línea',
        availability: 'Pagos en linea y soporte de facturacion',
        description:
          'Pague en linea a traves del portal de facturacion o comuniquese con el Ayuntamiento para saldo y opciones de pago.',
        href: '/pay-bill',
        cta: 'Abrir opciones de pago de servicios',
      },
      {
        title: 'Reporte un problema de calle o servicio',
        availability: 'Autoservicio',
        description:
          'Para reportar un bache, problema de agua o alcantarillado, alumbrado apagado, drenaje o molestia, use el formulario de reporte. Su envio va directamente al Superintendente del Pueblo.',
        href: '/services#issue-report',
        cta: 'Abrir formulario de reporte',
      },
      {
        title: 'Contactar a la secretaria del pueblo',
        availability: 'Contacte a la secretaria',
        description: 'Escriba a clerk@townofwiley.gov para registros y solicitudes de documentos.',
        href: '/contact',
        cta: 'Contactar a la secretaria del pueblo',
      },
      {
        title: 'Registrese para alertas de clima y emergencias',
        availability: 'Multicanal',
        description:
          'Para recibir avisos de clima severo y emergencias por mensaje de texto, vaya a la pagina del clima e ingrese su numero de telefono. Puede cancelar su suscripcion en cualquier momento.',
        href: '/weather',
        cta: 'Registrarse para alertas de clima',
      },
      {
        title: 'Acceda al sitio en espanol',
        availability: 'Acceso inclusivo',
        description:
          'Para cambiar el sitio al espanol, use el boton de idioma en la parte superior de cualquier pagina. Si necesita asistencia de interprete para un servicio del pueblo, llame al ayuntamiento.',
        href: '/accessibility',
        cta: 'Ver opciones de accesibilidad e idioma',
      },
      {
        title: 'Encontrar agendas y minutas de reuniones',
        availability: 'Busqueda en lenguaje sencillo',
        description:
          'Busque en la pagina principal o abra la pagina de Reuniones para agendas y minutas aprobadas.',
        href: '/meetings',
        cta: 'Abrir reuniones y documentos',
      },
    ],
    transparencyItems: [
      {
        title: 'Registros publicos y ayuda de la secretaria',
        detail:
          'Escriba a clerk@townofwiley.gov para registros publicos o solicitudes de documentos.',
      },
      {
        title: 'Agendas y minutas aprobadas',
        detail:
          'Las agendas y minutas aprobadas se publican en la pagina de Reuniones cuando estan disponibles.',
      },
      {
        title: 'Avisos y fechas limite del pueblo',
        detail:
          'Los avisos cubren obras viales, proyectos de servicios, cierres y operaciones principales del pueblo.',
      },
    ],
    transparencyActionsLabel: 'Acciones rapidas de transparencia',
    transparencyActions: [
      {
        title: 'Escribir a la secretaria',
        detail: 'Registros y documentos: clerk@townofwiley.gov',
        href: 'mailto:clerk@townofwiley.gov',
      },
      {
        title: 'Agendas y minutas de reuniones',
        detail: 'Consulte documentos publicados en la pagina de Reuniones.',
        href: '/meetings',
      },
    ],
    accessibilityItems: [
      {
        title: 'Soporte para teclado y lectores de pantalla',
        detail:
          'El sitio usa encabezados logicos, enlace para saltar contenido, foco visible y navegacion consistente.',
      },
      {
        title: 'Contraste legible y comportamiento al ampliar',
        detail: 'El texto cumple contraste WCAG 2.1 AA; el diseño admite zoom y texto mas grande.',
      },
      {
        title: 'Documentos y medios accesibles',
        detail:
          'Los PDF publicos, video y descargas se publican con accesibilidad en mente; comuniquese con la secretaria para formatos alternativos.',
      },
      {
        title: 'Comentarios y mejora continua',
        detail:
          'Use la declaracion de accesibilidad para solicitar adaptaciones o informar barreras; el pueblo revisa los comentarios de forma periodica.',
      },
    ],
    leadershipGroups: [
      {
        groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
        title: 'Funcionarios electos (Alcalde y Concejo)',
        detail: 'Funcionarios electos y rutas de contacto para reuniones.',
      },
      {
        groupId: LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
        title: 'Administracion del pueblo',
        detail: 'Contactos de la secretaria y del superintendente para servicios cotidianos.',
      },
    ],
  },
};

/**
 * PrimeNG MegaMenu: each root column is `MegaMenuItem[]`. Overlay rows need one synthetic group per
 * column whose `items` is a **flat** list of leaves at runtime (`createProcessedItems` iterates with
 * `forEach` expecting `MenuItem` nodes). Typings use `MenuItem[][]`; we assert the flat list to match.
 * A bare column `[leaf, leaf]` produces empty `submenu.items` on each row and no panel links.
 * Deeper `p-megamenu-grid` / `p-megamenu-col-*` nesting is produced by the library from this shape;
 * removing the wrapper is not supported without switching to a different nav component.
 *
 * @see https://primeng.org/megamenu#router
 *
 * Optionally set `columnLabel` so PrimeNG emits a `.p-megamenu-submenu-label` for that column’s group row.
 */
/** In-page anchor for severe weather alert signup on `/weather`. */
export const WEATHER_ALERT_SIGNUP_FRAGMENT = 'weather-alert-signup';

/** One flyout column: optional group label + flat leaf links (Prime MegaMenu group row). */
function megaMenuColumn(links: MegaMenuItem[], groupLabel?: string): MegaMenuItem[] {
  // Prime typings declare `items` as MenuItem[][]; flyout group rows use a flat leaf list at runtime.
  const group: MegaMenuItem = { items: links as MegaMenuItem[][] };
  const trimmed = groupLabel?.trim();
  if (trimmed) {
    group.label = trimmed;
  }
  return [group];
}

@Component({
  selector: 'app-root',
  imports: [
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    DrawerModule,
    ReactiveFormsModule,
    AvatarModule,
    ButtonModule,
    DividerModule,
    DatePickerModule,
    InputGroupModule,
    InputTextModule,
    TimelineModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TabsModule,
    ToolbarModule,
    ToastModule,
    MegaMenuModule,
    CardModule,
    FullCalendarModule,
    RouterOutlet,
    HomepageWeatherAlertPrimer,
    WeatherAlertBannerComponent,
    LocalizedWeatherPanel,
    ThisWeekInWileyComponent,
    Ripple,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private static readonly DEFAULT_SITE_TITLE = 'Town of Wiley';
  private static readonly MAX_META_DESCRIPTION_LENGTH = 160;
  private static readonly SEARCH_DEBOUNCE_MS = 120;
  /** Homepage notices timeline preview count; show “view all” when `notices.length` exceeds this. */
  private static readonly HOMEPAGE_NOTICES_PREVIEW = 3;

  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly headerEl = viewChild<ElementRef<HTMLElement>>('headerElement');
  private readonly platformId = inject(PLATFORM_ID);
  /** Global offline/online toasts (side effect only). */
  private readonly offlineConnectivityNotifier = inject(OfflineConnectivityNotifier);
  /** GA4 SPA page_view on NavigationEnd (side effect only). */
  private readonly googleAnalytics = inject(GoogleAnalyticsService);
  private readonly initialPath =
    typeof window !== 'undefined'
      ? normalizePath(`${window.location.pathname}${window.location.search}${window.location.hash}`)
      : normalizePath(this.router.url);
  private readonly initialFragment =
    typeof window !== 'undefined'
      ? window.location.hash.replace(/^#/, '')
      : (this.router.parseUrl(this.router.url).fragment ?? '');
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
  protected readonly calendarJumpMonth = signal<Date | null>(null);
  protected readonly meetingsTab = signal<'month' | 'list'>('month');
  protected readonly calendarHelpVisible = signal(false);
  protected readonly headerScrolled = signal(false);
  protected readonly sidebarVisible = signal(false);
  protected readonly mobileMenuItems = computed(() => this.menuItems());
  protected readonly siteAlertCardPt = {
    header: { class: 'site-alert-header' },
    body: { class: 'site-alert-body' },
    footer: { class: 'site-alert-footer' },
  };
  protected readonly supportCardPt = {
    header: { class: 'support-card-header' },
    body: { class: 'support-card-body' },
    footer: { class: 'support-card-footer' },
  };
  protected readonly taskCardPt = {
    content: { class: 'task-card-content' },
  };
  /**
   * PrimeNG MegaMenu sets aria-level on role=menuitem (invalid per ARIA) and aria-label on
   * <li> nodes that can mismatch visible flyout copy. Strip those; names come from our #item template.
   */
  protected readonly desktopMegaMenuPt = {
    panel: {
      class: 'p-6 shadow-xl border border-surface-200 rounded-3xl bg-surface-0',
    },
    submenu: { class: 'mega-menu-submenu' },
    submenuLabel: { class: 'mega-menu-column-label' },
    itemContent: { class: 'mega-menu-item-content' },
    item: {
      'aria-level': null,
      'aria-setsize': null,
      'aria-posinset': null,
      'aria-label': null,
    },
    itemIcon: { 'aria-hidden': 'true' },
    submenuIcon: { 'aria-hidden': 'true' },
    buttonIcon: { 'aria-hidden': 'true' },
  };
  /** Drawer title id must match `mobile-menu-nav` aria-labelledby in app.html. */
  protected readonly mobileDrawerPt = {
    title: { id: 'mobile-menu-drawer-title' },
    root: { 'aria-labelledby': 'mobile-menu-drawer-title' },
  };
  private readonly calendarTableState = signal<CalendarTableState>({
    first: 0,
    rows: 5,
    sortField: null,
    sortOrder: null,
  });
  protected readonly cmsContentLoading = this.cmsStore.isLoading;
  protected readonly cmsContentLoadFailed = this.cmsStore.hasLoadFailed;
  protected readonly cmsUsingCachedSnapshot = this.cmsStore.isUsingCachedSnapshot;
  protected readonly cmsLoadError = this.cmsStore.loadError;
  protected readonly cmsLoadFallbackDismissed = signal(false);
  private readonly routedFragmentScrollEffect = effect(() => {
    const fragment = this.currentFragment();

    if (!fragment) {
      return;
    }

    if (fragment === WEATHER_ALERT_SIGNUP_FRAGMENT) {
      this.scheduleFragmentScrollWithRetry(`#${fragment}`);
      return;
    }

    this.scheduleFragmentScroll(`#${fragment}`);
  });

  protected readonly calendarOptions = computed(() => ({
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    initialDate: this.calendarJumpMonth() ?? undefined,
    buttonIcons: false as const,
    buttonText: {
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      list: 'List',
      prev: 'Previous',
      next: 'Next',
    },
    events: this.calendarItems().map((item) => ({
      title: item.title,
      start: item.startDate,
      end: item.endDate,
      allDay: false,
      extendedProps: { item },
    })),
  }));

  protected readonly siteSearchForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
  });

  private readonly siteSearchDraftValue = toSignal(
    this.siteSearchForm.controls.query.valueChanges.pipe(
      startWith(this.siteSearchForm.controls.query.value),
    ),
    { initialValue: this.siteSearchForm.controls.query.value },
  );

  protected readonly searchDraftQuery = computed(() => this.siteSearchDraftValue());
  protected readonly searchQuery = signal('');

  constructor() {
    this.siteSearchForm.controls.query.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((query) => this.applySearchDraft(query));
  }
  protected readonly homepageWeatherAlert = signal<HomepageWeatherAlert | null>(null);
  protected readonly nwsBannerDismissed = signal(false);
  private lastHomepageWeatherAlertDismissKey: string | null = null;
  protected readonly currentYear = new Date().getFullYear();
  protected readonly isAdminMode = computed(() => this.currentPath() === '/admin');
  protected readonly isAdminLoginMode = computed(() => {
    const path = this.currentPath();
    return path === '/admin/login' || path === '/admin/new-staff';
  });
  protected readonly isClerkSetupMode = computed(() => this.currentPath() === '/clerk-setup');
  protected readonly isDocumentHubMode = computed(() => false);
  protected readonly isWeatherMode = computed(() => this.currentPath() === '/weather');
  protected readonly isNoticesMode = computed(() => this.currentPath() === '/notices');
  protected readonly isMeetingsMode = computed(() => this.currentPath() === '/meetings');
  protected readonly isServicesMode = computed(() => this.currentPath() === '/services');
  protected readonly isRecordsMode = computed(() => false);
  protected readonly isContactMode = computed(() => this.currentPath() === '/contact');
  protected readonly isAccessibilityMode = computed(() => this.currentPath() === '/accessibility');
  protected readonly isPrivacyMode = computed(() => this.currentPath() === '/privacy');
  protected readonly isTermsMode = computed(() => this.currentPath() === '/terms');
  protected readonly isBusinessesMode = computed(() => this.currentPath() === '/businesses');
  protected readonly isNewsMode = computed(() => this.currentPath() === '/news');
  protected readonly isPaymentsMode = computed(
    () => this.currentPath() === '/pay-bill' || this.currentPath() === '/payments',
  );
  protected readonly isTopLevelLazyRouteMode = computed(
    () =>
      this.isAdminMode() ||
      this.isAdminLoginMode() ||
      this.isClerkSetupMode() ||
      this.isDocumentHubMode(),
  );
  protected readonly isFeaturePageMode = computed(
    () =>
      this.isWeatherMode() ||
      this.isNoticesMode() ||
      this.isMeetingsMode() ||
      this.isServicesMode() ||
      this.isContactMode() ||
      this.isAccessibilityMode() ||
      this.isPrivacyMode() ||
      this.isTermsMode() ||
      this.isBusinessesMode() ||
      this.isNewsMode() ||
      this.isPaymentsMode(),
  );
  /** Unknown in-app URL: show wildcard route in main outlet (not admin/document clerk shell). */
  protected readonly isNotFoundMode = computed(() => {
    if (this.isTopLevelLazyRouteMode()) {
      return false;
    }

    const path = this.currentPath();

    if (path === '/' || path === '') {
      return false;
    }

    return !isPathRegisteredAppRoute(path);
  });
  protected readonly shouldPrimeWeatherAlerts = computed(
    () =>
      !this.isAdminMode() &&
      !this.isClerkSetupMode() &&
      !this.isDocumentHubMode() &&
      !this.isWeatherMode(),
  );
  protected readonly heroContent = this.cmsStore.hero;
  protected readonly cmsAlertBanner = this.cmsStore.alertBanner;
  protected readonly pageTitle = computed(() => this.heroContent().title);
  protected readonly browserTitle = computed(() => {
    const siteTitle = this.pageTitle()?.trim() || App.DEFAULT_SITE_TITLE;

    if (this.isNotFoundMode()) {
      return `${this.appCopy().notFoundBrowserTitle} | ${siteTitle}`;
    }

    const featureTitle = this.currentFeaturePage()?.title?.trim();

    if (!featureTitle || featureTitle === siteTitle) {
      return `${siteTitle} | Official Website`;
    }

    return `${featureTitle} | ${siteTitle}`;
  });
  protected readonly browserDescription = computed(() => {
    if (this.isNotFoundMode()) {
      return this.truncateMetaDescription(this.appCopy().notFoundMetaDescription);
    }

    const featurePage = this.currentFeaturePage();

    if (!featurePage) {
      return this.appCopy().siteMetaDescription;
    }

    const description = [featurePage.title, featurePage.summary].filter(Boolean).join('. ');

    return this.truncateMetaDescription(description || this.appCopy().siteMetaDescription);
  });
  protected readonly notices = this.cmsStore.notices;
  protected readonly liveCalendarEvents = this.cmsStore.events;
  protected readonly contacts = this.cmsStore.contacts;
  protected readonly siteLanguage = this.siteLanguageService.currentLanguage;
  protected readonly weatherAlertSignupFragment = WEATHER_ALERT_SIGNUP_FRAGMENT;
  protected readonly appCopy = computed((): AppCopy => {
    const lang = this.siteLanguage();
    const base = APP_COPY[lang];
    return applyAppCopySiteCopyOverrides(base, (key) => this.cmsStore.getSiteCopy(key), lang);
  });
  protected readonly menuItems = computed<MegaMenuItem[]>(() => {
    const copy = this.appCopy();

    return [
      {
        root: true,
        label: copy.menuQuickTasksLabel,
        icon: 'pi pi-list',
        items: [
          megaMenuColumn(
            [
              {
                label: copy.mobileOnlinePaymentsLabel,
                routerLink: '/pay-bill',
              },
              {
                label: copy.mobileIssueLabel,
                routerLink: ['/services'],
                fragment: 'issue-report',
              },
              {
                label: copy.meetingsQuickLinkLabel,
                routerLink: '/meetings',
                fragment: 'calendar',
              },
              {
                label: copy.communityCalendarQuickLinkLabel,
                routerLink: '/meetings',
                fragment: 'community',
              },
              {
                label: copy.mobileSearchAllServicesLabel,
                routerLink: ['/'],
                fragment: 'search-panel',
              },
            ],
            copy.menuQuickTasksServicesColumnLabel,
          ),
          megaMenuColumn(
            [
              { label: copy.featureTitles.weather, routerLink: '/weather', icon: 'pi pi-cloud' },
              { label: copy.nwsAlertLabel, routerLink: '/weather' },
              {
                label: copy.mobileWeatherAlertsLabel,
                routerLink: '/weather',
                fragment: WEATHER_ALERT_SIGNUP_FRAGMENT,
              },
              { label: copy.openCalendarLabel, routerLink: '/meetings', fragment: 'calendar' },
              {
                label: copy.communityCalendarQuickLinkLabel,
                routerLink: '/meetings',
                fragment: 'community',
                icon: 'pi pi-calendar-plus',
              },
            ],
            copy.menuQuickTasksWeatherColumnLabel,
          ),
        ],
      },
      {
        root: true,
        label: copy.menuGovernmentLabel,
        icon: 'pi pi-building',
        items: [
          megaMenuColumn(
            [
              {
                label: copy.featureTitles.meetings,
                routerLink: '/meetings',
                icon: 'pi pi-calendar',
              },
              { label: copy.calendarKicker, routerLink: '/meetings', fragment: 'calendar' },
              {
                label: copy.communityCalendarQuickLinkLabel,
                routerLink: '/meetings',
                fragment: 'community',
                icon: 'pi pi-calendar-plus',
              },
              { label: copy.featureTitles.records, routerLink: '/meetings', icon: 'pi pi-folder' },
            ],
            copy.menuGovernmentMeetingsColumnLabel,
          ),
          megaMenuColumn(
            [
              { label: copy.transparencyKicker, routerLink: '/contact' },
              { label: copy.featureTitles.accessibility, routerLink: '/accessibility' },
              { label: copy.menuLeadershipLabel, routerLink: '/contact', fragment: 'leadership' },
            ],
            copy.menuGovernmentTownColumnLabel,
          ),
        ],
      },
      {
        root: true,
        label: copy.menuServicesPermitsLabel,
        icon: 'pi pi-briefcase',
        items: [
          megaMenuColumn(
            [
              {
                label: copy.mobileOnlinePaymentsLabel,
                routerLink: '/pay-bill',
              },
              { label: copy.mobileIssueLabel, routerLink: ['/services'], fragment: 'issue-report' },
              { label: copy.featureTitles.services, routerLink: '/services' },
            ],
            copy.menuServicesPermitsLabel,
          ),
          megaMenuColumn(
            [
              { label: copy.featureTitles.records, routerLink: '/meetings' },
              { label: copy.openCalendarLabel, routerLink: '/meetings', fragment: 'calendar' },
            ],
            copy.menuServicesRelatedColumnLabel,
          ),
        ],
      },
      {
        root: true,
        label: copy.menuNewsNoticesLabel,
        icon: 'pi pi-bell',
        items: [
          megaMenuColumn([
            { label: copy.featureTitles.notices, routerLink: '/notices', icon: 'pi pi-bell' },
            { label: copy.featureTitles.news, routerLink: '/news', icon: 'pi pi-newspaper' },
          ]),
          megaMenuColumn([
            { label: copy.nwsAlertLabel, routerLink: '/weather' },
            {
              label: copy.alertActionLabel,
              routerLink: '/weather',
              fragment: WEATHER_ALERT_SIGNUP_FRAGMENT,
            },
          ]),
        ],
      },
      {
        root: true,
        label: copy.menuWeatherLabel,
        icon: 'pi pi-cloud',
        routerLink: '/weather',
      },
      {
        root: true,
        label: copy.menuBusinessCommunityLabel,
        icon: 'pi pi-users',
        routerLink: '/businesses',
      },
      {
        root: true,
        label: copy.menuContactHallLabel,
        icon: 'pi pi-envelope',
        routerLink: '/contact',
      },
    ];
  });

  private buildMenuUrl(path: string, fragment?: string): string {
    return this.router.serializeUrl(
      this.router.createUrlTree([path], fragment ? { fragment } : undefined),
    );
  }

  protected activateMegaMenuItem(item: MegaMenuItem, event: MouseEvent): void {
    if (!item.command) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    item.command(event);
  }

  /** Serialized href for mega menu subtrees built as plain `<a href>` so middle-click/new-tab keeps working. */
  protected megaMenuLeafHref(item: MegaMenuItem): string {
    const rl = item.routerLink;
    if (rl == null) {
      return '/';
    }

    const commands = Array.isArray(rl) ? rl : [rl];
    const extras =
      item.fragment != null && item.fragment !== '' ? { fragment: item.fragment } : undefined;

    return this.router.serializeUrl(this.router.createUrlTree(commands, extras));
  }

  /**
   * Flyout submenu links used `activateMegaMenuItem`, which returned early unless `command` was set—so clicks
   * were swallowed in production hydration/event-replay setups. Navigate imperatively here (same UX as RouterLink).
   */
  protected onMegaMenuLeafClick(item: MegaMenuItem, event: MouseEvent): void {
    if (item.command) {
      event.preventDefault();
      event.stopPropagation();
      item.command(event);
      return;
    }

    if (item.routerLink == null) {
      return;
    }

    const allowBrowserDefaultNavigation =
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey;

    if (allowBrowserDefaultNavigation) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const commands = Array.isArray(item.routerLink) ? item.routerLink : [item.routerLink];
    const extras =
      item.fragment != null && item.fragment !== '' ? { fragment: item.fragment } : undefined;

    void this.router.navigate(commands, extras);
  }

  private navigateTo(path: string, fragment?: string): void {
    void this.router.navigate([path], fragment ? { fragment } : undefined);
  }

  protected readonly privacyPolicyCopy = computed(
    () => WEATHER_ALERT_POLICY_COPY[this.siteLanguage()].privacy,
  );
  protected readonly smsTermsCopy = computed(
    () => WEATHER_ALERT_POLICY_COPY[this.siteLanguage()].terms,
  );
  protected readonly languageChoices = computed(() => [
    { label: this.appCopy().languageOptions.es, value: 'es' as SiteLanguage },
    { label: this.appCopy().languageOptions.en, value: 'en' as SiteLanguage },
  ]);
  protected readonly primaryNavLinks = computed<PrimaryNavLink[]>(() => {
    const copy = this.appCopy();
    return [
      { label: copy.homeLabel, routerLink: '/' },
      { label: copy.primaryNavServicesLabel, routerLink: '/services' },
      { label: copy.primaryNavMeetingsLabel, routerLink: '/meetings' },
      {
        label: copy.communityCalendarQuickLinkLabel,
        routerLink: '/meetings',
        fragment: 'community',
      },
      { label: copy.primaryNavDocumentsLabel, routerLink: '/meetings' },
      { label: copy.primaryNavPayLabel, routerLink: '/pay-bill' },
      { label: copy.primaryNavContactLabel, routerLink: '/contact' },
    ];
  });
  protected readonly primaryContact = computed<CmsContact | null>(() => {
    return (
      this.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION) ??
      this.contacts()[0] ??
      null
    );
  });
  protected readonly clerkContact = computed<CmsContact | null>(() => {
    return (
      this.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_CITY_CLERK) ??
      this.contacts()[1] ??
      null
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
  private readonly logging = inject(LoggingService);

  // Dynamic CMS-backed overrides for frequently changed UI copy (SiteCopy model).
  // Falls back to bundled APP_COPY when no active CMS row for the key.
  // Example of closing the "homepage chrome / top tasks" gap.
  private getDynamicLabel(key: string, fallback: string): string {
    const override = this.cmsStore.getSiteCopy(key);
    if (!override) return fallback;
    return this.siteLanguage() === 'es' && override.es ? override.es : override.en;
  }

  protected readonly topTasks = computed(() => this.appCopy().topTasks);

  // Live (CMS-overridable) values for the top "How do I..." section.
  protected readonly topTasksKicker = computed(() => this.appCopy().topTasksKicker);
  protected readonly topTasksHeading = computed(() => this.appCopy().topTasksHeading);

  protected readonly featurePages = computed<FeaturePage[]>(() => {
    const copy = this.appCopy();
    const alertBanner = this.alertBanner();
    const weatherAlert = this.homepageWeatherAlert();
    const latestNotice = this.notices()[0];
    const nextCalendarItem = this.calendarItems()[0];
    const primaryContact = this.primaryContact();
    const clerkContact = this.clerkContact();

    return [
      {
        id: 'weather',
        kicker: weatherAlert ? copy.nwsAlertLabel : copy.featureTitles.weather,
        title: copy.featureTitles.weather,
        summary: weatherAlert
          ? [alertBanner.title, alertBanner.detail].filter(Boolean).join(' ')
          : copy.alertHeadline,
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
        kicker: copy.meetingsKicker,
        title: copy.featureTitles.records,
        summary: copy.documentsFeatureSummary,
        href: '/meetings',
        showOnHomepage: false,
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
      {
        id: 'privacy',
        kicker: this.privacyPolicyCopy().kicker,
        title: copy.featureTitles.privacy,
        summary: copy.privacySummary,
        href: '/privacy',
        showOnHomepage: false,
      },
      {
        id: 'terms',
        kicker: this.smsTermsCopy().kicker,
        title: copy.featureTitles.terms,
        summary: copy.termsSummary,
        href: '/terms',
        showOnHomepage: false,
      },
      {
        id: 'businesses',
        kicker: 'Business Directory',
        title: 'Wiley Community Business Directory',
        summary: 'Discover and support local businesses in Wiley with contact info and websites.',
        href: '/businesses',
        showOnHomepage: false,
      },
      {
        id: 'news',
        kicker: 'News',
        title: 'Town News and Announcements',
        summary: 'Latest announcements, notices, and external news about Wiley.',
        href: '/news',
        showOnHomepage: false,
      },
      {
        id: 'payments',
        kicker: copy.servicesKicker,
        title: copy.featureTitles.payments,
        summary: copy.paymentsFeatureSummary,
        href: '/pay-bill',
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
  private readonly pageViewLoggingEffect = effect(() => {
    const path = this.currentPath();
    const fragment = this.currentFragment();
    const title = this.currentFeaturePage()?.title || this.pageTitle();

    this.logging.pageView(path, fragment, title);
  });
  private readonly browserMetadataEffect = effect(() => {
    const title = this.browserTitle();
    const description = this.browserDescription();

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
  });
  private readonly headerScrollEffect = effect(() => {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const handleScroll = () => {
      this.headerScrolled.set(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  });
  protected readonly homepageNotices = computed(() =>
    this.notices().slice(0, App.HOMEPAGE_NOTICES_PREVIEW),
  );
  protected readonly cmsNoticeRouteLink = getCmsNoticeRouteLink;
  protected readonly cmsNoticeFragmentId = cmsNoticeFragmentId;
  protected cmsNoticeLinkAriaLabel(notice: CmsNotice): string {
    return getCmsNoticeLinkAriaLabel(notice, this.siteLanguageService.currentLanguage() || 'en');
  }
  protected readonly showBrowseNoticesLink = computed(
    () => this.notices().length > App.HOMEPAGE_NOTICES_PREVIEW,
  );
  protected readonly meetings = computed<MeetingItem[]>(() => {
    const liveEvents = this.liveCalendarEvents();
    const linkedAgendaByEventId = this.cmsStore.linkedAgendaDocumentByEventId();
    const extraNotices = this.notices().length > App.HOMEPAGE_NOTICES_PREVIEW;

    if (liveEvents.length) {
      return liveEvents.map((event) =>
        this.createMeetingItemFromEvent(event, linkedAgendaByEventId),
      );
    }

    return this.appCopy().meetings.map((m) => {
      const copy = this.appCopy();
      const agendaPdfHref = m.agendaPdfHref ?? '/meetings';
      const agendaButtonLabel =
        m.href === '/notices' ? copy.meetingsDocumentsHubButtonLabel : undefined;

      if (m.href === '/notices' && !extraNotices) {
        return {
          title: m.title,
          schedule: m.schedule,
          format: m.format,
          location: m.location,
          agendaNote: m.agendaNote,
          agendaPdfHref,
          agendaButtonLabel,
        };
      }

      return { ...m, agendaPdfHref, agendaButtonLabel };
    });
  });
  protected readonly calendarItems = computed(() => {
    const liveEvents = this.liveCalendarEvents();
    const linkedAgendaByEventId = this.cmsStore.linkedAgendaDocumentByEventId();

    return liveEvents.length
      ? liveEvents.map((event, index) =>
          this.createCalendarItemFromEvent(event, index === 0, linkedAgendaByEventId),
        )
      : this.appCopy().calendarSeeds.map((seed, index) =>
          this.createCalendarItem(seed, index === 0),
        );
  });
  protected readonly calendarTableTotalRecords = computed(() => this.calendarItems().length);
  protected readonly calendarTableFirst = computed(() => {
    const totalRecords = this.calendarTableTotalRecords();
    const { first, rows } = this.calendarTableState();

    if (totalRecords <= 0) {
      return 0;
    }

    const safeRows = Math.max(rows, 1);
    const maxFirst = Math.max(totalRecords - safeRows, 0);

    return Math.min(first, maxFirst);
  });
  protected readonly calendarTableRows = computed(() => this.calendarTableState().rows);
  protected readonly calendarTableSortField = computed(
    () => this.calendarTableState().sortField ?? undefined,
  );
  protected readonly calendarTableSortOrder = computed(
    () => this.calendarTableState().sortOrder ?? 1,
  );
  protected readonly calendarTableItems = computed(() => {
    const state = this.calendarTableState();
    const items = this.sortCalendarItems(this.calendarItems(), state.sortField, state.sortOrder);
    const first = this.calendarTableFirst();

    return items.slice(first, first + state.rows);
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
      nextEventValue: copy.openCalendarLabel,
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
  private readonly weatherSearchKeywords = computed<string[]>(() =>
    this.siteLanguage() === 'en'
      ? ['weather', 'forecast', 'alerts', 'warning', 'watch', 'advisory', 'wind', 'snow']
      : ['clima', 'pronostico', 'alertas', 'advertencia', 'vigilancia', 'aviso', 'viento', 'nieve'],
  );
  private readonly weatherSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();
    const alertBanner = this.alertBanner();
    const weatherAlert = this.homepageWeatherAlert();

    return [
      {
        title: weatherAlert ? alertBanner.title : copy.featureTitles.weather,
        summary: weatherAlert ? alertBanner.detail : copy.alertHeadline,
        category: weatherAlert ? copy.nwsAlertLabel : copy.featureTitles.weather,
        href: '/weather',
        keywords: this.buildSearchKeywords(
          copy.alertHeadline,
          copy.alertActionLabel,
          copy.nwsAlertLinkLabel,
          ...this.weatherSearchKeywords(),
        ),
      },
    ];
  });
  private readonly topTaskSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.topTasks().map((task) => ({
      title: task.title,
      summary: task.description,
      category: copy.topTasksKicker,
      href: task.href,
      keywords: this.buildSearchKeywords(task.description, task.note),
    }));
  });
  private readonly meetingSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.meetings().map((meeting) => ({
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
    }));
  });
  private readonly calendarSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.calendarItems().map((item) => ({
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
    }));
  });
  private readonly meetingDocumentsSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();
    const language = this.siteLanguage();

    return this.cmsStore
      .publicDocuments()
      .map((doc) => localizeCmsPublicDocument(doc, language))
      .map((document) => ({
        title: document.title,
        summary: document.summary,
        category: copy.meetingsKicker,
        href: `/meetings#cms-doc-${document.id}`,
        keywords: this.buildSearchKeywords(document.format, ...document.keywords),
      }));
  });
  private readonly serviceSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.serviceCards().map((service) => ({
      title: service.title,
      summary: service.description,
      category: copy.servicesKicker,
      href: service.href,
      keywords: this.buildSearchKeywords(service.availability, service.cta),
    }));
  });
  private readonly transparencySearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.transparencyActions().map((action) => ({
      title: action.title,
      summary: action.detail,
      category: copy.transparencyKicker,
      href: action.href,
      keywords: this.buildSearchKeywords(action.detail),
    }));
  });
  private readonly noticeSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.notices().map((notice) => ({
      title: notice.title,
      summary: notice.detail,
      category: copy.noticesKicker,
      href: '/notices',
      keywords: this.buildSearchKeywords(notice.date),
    }));
  });
  private readonly contactSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.contacts().map((contact) => ({
      title: contact.value ? `${contact.label}: ${contact.value}` : contact.label,
      summary: contact.detail,
      category: copy.contactKicker,
      href: contact.href ?? '/contact',
      keywords: this.buildSearchKeywords(contact.label, contact.value, contact.linkLabel),
    }));
  });
  private readonly accessibilitySearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.accessibilityItems().map((item) => ({
      title: item.title,
      summary: item.detail,
      category: copy.accessibilityKicker,
      href: '/accessibility',
      keywords: this.buildSearchKeywords(item.detail),
    }));
  });
  private readonly featurePageSearchItems = computed<SearchItem[]>(() => {
    return this.featurePages().map((page) => ({
      title: page.title,
      summary: page.summary,
      category: page.kicker || 'Features',
      href: page.href,
      keywords: this.buildSearchKeywords(page.title, page.summary, page.kicker || ''),
    }));
  });
  protected readonly searchIndex = computed<SearchItem[]>(() => {
    return this.dedupeSearchItems([
      ...this.weatherSearchItems(),
      ...this.topTaskSearchItems(),
      ...this.meetingSearchItems(),
      ...this.calendarSearchItems(),
      ...this.meetingDocumentsSearchItems(),
      ...this.serviceSearchItems(),
      ...this.transparencySearchItems(),
      ...this.noticeSearchItems(),
      ...this.contactSearchItems(),
      ...this.accessibilitySearchItems(),
      ...this.featurePageSearchItems(),
    ]);
  });
  private readonly normalizedSearchQuery = computed(() => this.searchQuery().trim().toLowerCase());
  protected readonly isSearchPending = computed(
    () => this.searchDraftQuery().trim().toLowerCase() !== this.normalizedSearchQuery(),
  );
  private readonly searchTerms = computed(() =>
    this.normalizedSearchQuery().split(/\s+/).filter(Boolean),
  );
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  protected focusMainContent(event?: Event): void {
    event?.preventDefault();

    if (typeof window !== 'undefined') {
      window.location.hash = 'main-content';
    }

    queueMicrotask(() => {
      const fromViewChild = this.mainContent()?.nativeElement;
      const fromDom =
        typeof document !== 'undefined' ? document.getElementById('main-content') : null;
      (fromViewChild ?? fromDom)?.focus();
    });
  }
  protected readonly searchResults = computed(() => {
    const query = this.normalizedSearchQuery();
    const searchIndex = this.searchIndex();

    if (!query) {
      return searchIndex.slice(0, 5);
    }

    const terms = this.searchTerms();

    return searchIndex
      .map((item) => ({
        item,
        score: this.scoreSearchItem(item, terms, query),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ item }) => item);
  });

  protected readonly trackCalendarRow = (_index: number, item: CalendarItem): string => item.id;

  protected applySearchDraft(query: string): void {
    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
      this.searchDebounceHandle = null;
    }

    if (!query.trim()) {
      this.searchQuery.set('');
      return;
    }

    this.searchDebounceHandle = setTimeout(() => {
      this.searchQuery.set(query);
      this.searchDebounceHandle = null;
    }, App.SEARCH_DEBOUNCE_MS);
  }

  protected resolveAppLink(href: string | null | undefined, defaultPath = '/'): AppRouteLink {
    return getAppRouteLink(href, defaultPath);
  }

  protected isCurrentRouteLink(link: AppRouteLink): boolean {
    if (!link.isInternal || !link.path) {
      return false;
    }

    if (link.path !== this.currentPath()) {
      return false;
    }

    if (link.fragment) {
      return this.currentFragment() === link.fragment;
    }

    return !this.currentFragment() || link.path !== '/';
  }

  protected performSearch(event?: Event): void {
    event?.preventDefault();

    const query = this.siteSearchForm.controls.query.value.trim();

    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
      this.searchDebounceHandle = null;
    }

    this.searchQuery.set(query);

    if (!query) {
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

  private scoreSearchItem(item: SearchItem, terms: string[], normalizedQuery: string): number {
    const title = item.title.toLowerCase();
    const summary = item.summary.toLowerCase();
    const category = item.category.toLowerCase();
    const href = item.href.toLowerCase();
    const keywords = item.keywords.map((keyword) => keyword.toLowerCase());
    const haystack = [title, summary, category, ...keywords].join(' ');
    const hasMeetingIntent = terms.some((term) =>
      ['meeting', 'meetings', 'calendar', 'agenda', 'council'].includes(term),
    );
    const hasContactIntent = terms.some((term) =>
      ['contact', 'clerk', 'email', 'phone', 'call'].includes(term),
    );
    const hasDocumentIntent = terms.some((term) =>
      [
        'document',
        'documents',
        'record',
        'records',
        'minutes',
        'packet',
        'form',
        'pdf',
        'archive',
        'guide',
      ].includes(term),
    );

    if (!terms.every((term) => haystack.includes(term))) {
      return 0;
    }

    let score = 0;

    if (title.includes(normalizedQuery)) {
      score += 40;
    }

    if (category.includes(normalizedQuery)) {
      score += 20;
    }

    if (summary.includes(normalizedQuery)) {
      score += 10;
    }

    if (keywords.some((keyword) => keyword.includes(normalizedQuery))) {
      score += 16;
    }

    if ((href === '/meetings' || href.startsWith('/meetings#')) && hasMeetingIntent) {
      score += 30;
    }

    if (
      (href === '/contact' || href.startsWith('mailto:') || href.startsWith('tel:')) &&
      hasContactIntent
    ) {
      score += 24;
    }

    if (
      href.startsWith('mailto:') &&
      title.includes('clerk') &&
      terms.some((term) => ['clerk', 'deb', 'dillon'].includes(term))
    ) {
      score += 48;
    }

    if (href.startsWith('/meetings#') && !hasDocumentIntent) {
      score -= 12;
    }

    for (const term of terms) {
      if (title.includes(term)) {
        score += 8;
      }

      if (category.includes(term)) {
        score += 6;
      }

      if (keywords.some((keyword) => keyword.includes(term))) {
        score += 4;
      }

      if (summary.includes(term)) {
        score += 2;
      }

      if (href.includes(term)) {
        score += 1;
      }
    }

    return score;
  }

  protected trackAlertSignupClick(): void {
    this.logging.buttonClick('alert-signup');
  }

  protected openCalendar(event?: Event): void {
    this.logging.buttonClick('calendar-open');
    event?.preventDefault();

    if (this.isMeetingsMode()) {
      this.scrollToFragment('#calendar');
      return;
    }

    this.router.navigate(['/meetings'], { fragment: 'calendar' });
  }

  protected updateCalendarJumpMonth(value: Date | null): void {
    this.calendarJumpMonth.set(value);
  }

  protected openMobileMenu(): void {
    this.sidebarVisible.set(true);
  }

  protected closeMobileMenu(): void {
    this.sidebarVisible.set(false);
  }

  protected retryCmsContent(): void {
    this.cmsLoadFallbackDismissed.set(false);
    void this.cmsStore.refreshContent();
  }

  protected dismissCmsLoadFallbackNotice(): void {
    this.cmsLoadFallbackDismissed.set(true);
  }

  protected updateCalendarTable(event: {
    first?: number | null;
    rows?: number | null;
    sortField?: string | string[] | null;
    sortOrder?: number | null;
  }): void {
    const currentState = this.calendarTableState();
    const sortField = this.toCalendarTableSortField(event.sortField);
    const sortOrder = event.sortOrder === -1 || event.sortOrder === 1 ? event.sortOrder : null;

    this.calendarTableState.set({
      first: Math.max(event.first ?? currentState.first, 0),
      rows: Math.max(event.rows ?? currentState.rows, 1),
      sortField,
      sortOrder: sortField ? sortOrder : null,
    });
  }

  protected updateMeetingsTab(value: string | number | null | undefined): void {
    this.meetingsTab.set(value === 'list' ? 'list' : 'month');
  }

  protected openCalendarHelp(): void {
    this.calendarHelpVisible.set(true);
  }

  protected closeCalendarHelp(): void {
    this.calendarHelpVisible.set(false);
  }

  protected updateHomepageWeatherAlert(alert: HomepageWeatherAlert | null): void {
    const nextKey = alert ? `${alert.event}::${alert.headline}` : null;
    if (nextKey !== this.lastHomepageWeatherAlertDismissKey) {
      this.nwsBannerDismissed.set(false);
      this.lastHomepageWeatherAlertDismissKey = nextKey;
    }
    this.homepageWeatherAlert.set(alert);
  }

  protected onNwsBannerSignup(): void {
    this.trackAlertSignupClick();
    const anchorId = WEATHER_ALERT_SIGNUP_FRAGMENT;
    void this.router.navigate(['/weather'], { fragment: anchorId }).then(() => {
      this.scheduleFragmentScrollWithRetry(`#${anchorId}`);
    });
  }

  protected updateSiteLanguage(value: SiteLanguage): void {
    this.logging.buttonClick(`language-${value}`);
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
      href.startsWith('tel:')
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

  /**
   * Weather signup may render after runtime config resolves; retry so the anchor exists before scrolling.
   */
  private scheduleFragmentScrollWithRetry(fragment: string, maxAttempts = 12): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    let attempts = 0;

    const attempt = () => {
      attempts += 1;
      const target = document.querySelector<HTMLElement>(fragment);
      if (target) {
        this.scrollToFragment(fragment);
        return;
      }
      if (attempts < maxAttempts) {
        window.setTimeout(attempt, 100);
      }
    };

    window.setTimeout(attempt, 0);
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
    const startDate = this.parseCalendarSeedDate(seed.startLocal);
    const endDate = this.parseCalendarSeedDate(seed.endLocal);

    return {
      id: seed.slug,
      source: 'seed',
      sourceLabel: copy.calendarFallbackBadge,
      isFeatured,
      sortDate: startDate.getTime(),
      startDate,
      endDate,
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
          href: '',
          isAgendaAction: true,
        },
        ...(seed.extraActions ?? []),
      ],
    };
  }

  private createMeetingItemFromEvent(
    event: CmsCalendarEvent,
    linkedAgendaByEventId: Record<
      string,
      import('./public-document-event-link').LinkedAgendaDocument
    > = {},
  ): MeetingItem {
    const copy = this.appCopy();
    const start = new Date(event.start);
    const end = this.resolveCalendarEventEnd(event);
    const linked = linkedAgendaByEventId[event.id];

    return {
      title: event.title,
      schedule: this.formatCalendarEventDate(start, end),
      format: event.description || copy.calendarEventFallbackDetail,
      location: event.location || copy.calendarEventFallbackLocation,
      eventId: event.id,
      hasLinkedAgenda: Boolean(linked),
      agendaStorageHref: linked?.storageHref,
      agendaButtonLabel: linked
        ? copy.meetingsAgendaLinkedButtonLabel
        : copy.meetingsAgendaPdfButtonLabel,
    };
  }

  private createCalendarItemFromEvent(
    event: CmsCalendarEvent,
    isFeatured: boolean,
    linkedAgendaByEventId: Record<
      string,
      import('./public-document-event-link').LinkedAgendaDocument
    > = {},
  ): CalendarItem {
    const copy = this.appCopy();
    const start = new Date(event.start);
    const end = this.resolveCalendarEventEnd(event);
    const linked = linkedAgendaByEventId[event.id];

    return {
      id: event.id,
      source: 'live',
      sourceLabel: copy.calendarManagedBadge,
      isFeatured,
      sortDate: start.getTime(),
      startDate: start,
      endDate: end,
      title: event.title,
      date: this.formatCalendarEventDate(start, end),
      category: copy.calendarPublishedEventCategory,
      detail: event.description || copy.calendarEventFallbackDetail,
      location: event.location || copy.calendarEventFallbackLocation,
      recurrence: copy.calendarScheduledEventLabel,
      hasLinkedAgenda: Boolean(linked),
      agendaStorageHref: linked?.storageHref,
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
          label: linked ? copy.calendarAgendaLinkedActionLabel : copy.calendarAgendaActionLabel,
          href: '',
          isAgendaAction: true,
        },
      ],
    };
  }

  private createGoogleCalendarLink(seed: CalendarEventSeed): string {
    return createGoogleCalendarLinkForSeed(seed);
  }

  private createIcsLink(seed: CalendarEventSeed): string {
    return createIcsDataUrlForSeed(seed);
  }

  private createGoogleCalendarLinkFromEvent(event: CmsCalendarEvent, end: Date): string {
    const copy = this.appCopy();

    return createGoogleCalendarLinkForEvent(
      event,
      end,
      copy.calendarEventFallbackDetail,
      copy.calendarEventFallbackLocation,
    );
  }

  private createIcsLinkFromEvent(event: CmsCalendarEvent, end: Date): string {
    const copy = this.appCopy();

    return createIcsDataUrlForEvent(
      event,
      end,
      copy.calendarEventFallbackDetail,
      copy.calendarEventFallbackLocation,
    );
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

  private sortCalendarItems(
    items: CalendarItem[],
    sortField: CalendarTableSortField | null,
    sortOrder: 1 | -1 | null,
  ): CalendarItem[] {
    if (!sortField || !sortOrder) {
      return items;
    }

    const direction = sortOrder === -1 ? -1 : 1;

    return [...items].sort((left, right) => {
      const leftValue = this.getCalendarSortValue(left, sortField);
      const rightValue = this.getCalendarSortValue(right, sortField);

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * direction;
      }

      return (
        String(leftValue).localeCompare(String(rightValue), undefined, {
          numeric: true,
          sensitivity: 'base',
        }) * direction
      );
    });
  }

  private getCalendarSortValue(
    item: CalendarItem,
    sortField: CalendarTableSortField,
  ): number | string {
    switch (sortField) {
      case 'date':
        return item.sortDate;
      case 'title':
        return item.title;
      case 'category':
        return item.category;
      case 'location':
        return item.location;
      case 'recurrence':
        return item.recurrence;
    }
  }

  private toCalendarTableSortField(
    value: string | string[] | null | undefined,
  ): CalendarTableSortField | null {
    switch (value) {
      case 'title':
      case 'date':
      case 'category':
      case 'location':
      case 'recurrence':
        return value;
      default:
        return null;
    }
  }

  private parseCalendarSeedTimestamp(value: string): number {
    return this.parseCalendarSeedDate(value).getTime();
  }

  private parseCalendarSeedDate(value: string): Date {
    const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);

    if (!match) {
      return new Date(0);
    }

    const [, year, month, day, hour, minute, second] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
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

  protected formatCalendarMonth(value: Date): string {
    const formatter =
      this.siteLanguage() === 'es'
        ? new Intl.DateTimeFormat('es-US', { month: 'long', year: 'numeric' })
        : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

    return formatter.format(value);
  }

  private truncateMetaDescription(value: string): string {
    if (value.length <= App.MAX_META_DESCRIPTION_LENGTH) {
      return value;
    }

    return `${value.slice(0, App.MAX_META_DESCRIPTION_LENGTH - 3).trimEnd()}...`;
  }
}
