/** Types for bundled site copy (APP_COPY) and related shell models. */
import type { SiteLanguage } from '../site-language';

export interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

export interface PrimaryNavLink {
  label: string;
  routerLink: string;
  fragment?: string;
}

export interface TopTask {
  title: string;
  description: string;
  href: string;
  note: string;
}

export interface MeetingItem {
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

export interface CalendarAction {
  label: string;
  href: string;
  downloadFileName?: string;
  external?: boolean;
  isAgendaAction?: boolean;
}

export interface CalendarItem {
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

export interface CalendarEventSeed {
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

export interface CalendarOverview {
  statusKicker: string;
  summary: string;
  detail: string;
  nextEventLabel: string;
  nextEventValue: string;
}

export type CalendarTableSortField = 'title' | 'date' | 'category' | 'location' | 'recurrence';

export interface CalendarTableState {
  first: number;
  rows: number;
  sortField: CalendarTableSortField | null;
  sortOrder: 1 | -1 | null;
}

export interface ServiceCard {
  title: string;
  availability: string;
  description: string;
  href: string;
  cta: string;
}

export interface TransparencyItem {
  title: string;
  detail: string;
}

export interface TransparencyAction {
  title: string;
  detail: string;
  href: string;
}

export interface AccessibilityItem {
  title: string;
  detail: string;
}

export interface PolicyItem {
  title: string;
  detail: string;
}

export interface PolicyPageCopy {
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

export interface SearchItem {
  title: string;
  summary: string;
  category: string;
  href: string;
  keywords: string[];
}

export interface CommunityFact {
  label: string;
  value: string;
  detail: string;
}

export type FeaturePageId =
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
  | 'history'
  | 'news'
  | 'payments'
  | 'documents';

export type FeatureTitles = Record<FeaturePageId, string>;

export interface FeaturePage {
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
  footerLinksAriaLabel: string;
  residentShortcutsAriaLabel: string;
  returnHomeAriaLabel: string;
  meetingsNextHeading: string;
  contactAdministrationAriaLabel: string;
  calendarLegendAriaLabel: string;
  businessesFeatureSummary: string;
  newsFeatureSummary: string;
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
  /** Place name under Visit & call (e.g. Wiley Town Hall). */
  contactTownHallPlaceName: string;
  /** Staff table column: role. */
  contactStaffRoleColumnLabel: string;
  /** Staff table column: name. */
  contactStaffNameColumnLabel: string;
  /** Staff table column: email. */
  contactStaffEmailColumnLabel: string;
  /** In-page jump link: Visit & call section. */
  contactJumpVisitLabel: string;
  /** In-page jump link: Town staff section. */
  contactJumpStaffLabel: string;
  /** In-page jump link: Mayor & Council section. */
  contactJumpElectedLabel: string;
  /** Heading for the single agenda / clerk-help note (OfficialContact town-information detail). */
  contactAgendaNoteTitle: string;
  /** Link from contact page to meeting notices. */
  contactMeetingsLinkLabel: string;
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
  historyKicker: string;
  historyHeading: string;
  historyDocumentAlt: string;
  historyOpenPdfLabel: string;
  historyFeatureSummary: string;
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
  /** Mega menu leaf under Businesses & Community. */
  menuBusinessDirectoryLabel: string;
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
