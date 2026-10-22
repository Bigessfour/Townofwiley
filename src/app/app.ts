/**
 * Go-Live Checklist (before promoting to production):
 * - `ng build --configuration production` with zero warnings; bundle budgets satisfied.
 * - Unit tests (`npm test` / Vitest) and smoke E2E pass on the release candidate.
 * - CMS/runtime config (`__TOW_RUNTIME_CONFIG__`), Amplify env, and secrets verified for prod.
 * - Analytics/monitoring hooks reviewed; SSL and redirects correct for the live domain.
 * - PDFs and static assets published under `public/documents` (and archive links) match clerk uploads.
 */
import { NgOptimizedImage, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
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
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MegaMenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MegaMenuModule } from 'primeng/megamenu';
import { Ripple } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { filter, map, startWith } from 'rxjs';
import { cmsNoticeFragmentId } from './cms-notice-link';
import { AppRouteLink, getAppRouteLink, normalizeAppRoutePath } from './internal-route-link';
import {
  buildBrowserDescription,
  buildBrowserTitle,
  DEFAULT_SITE_TITLE,
} from './shell/browser-meta';
import {
  scheduleFragmentScroll,
  scheduleFragmentScrollWithRetry,
  scrollToFragment,
} from './shell/fragment-scroll';
import { buildFeaturePages } from './site-route/build-feature-pages';
import { findCurrentFeaturePage } from './site-route/find-current-feature-page';
import { resolveSiteRouteChrome } from './site-route/site-route-chrome';
import { LoggingService } from './logging.service';
import { localizeCmsPublicDocument } from './meeting-documents/localize-public-document';
import {
  CmsAlertBanner,
  CmsContact,
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
} from './site-cms-content';
import { applyAppCopySiteCopyOverrides } from './site-copy-overrides';
import { SiteLanguage, SiteLanguageService } from './site-language';
import { WeatherAlertBannerComponent } from './weather-alert-banner/weather-alert-banner.component';
import { HomepageWeatherAlertPrimer } from './weather-panel/homepage-weather-alert-primer';
import { type HomepageWeatherAlert } from './weather-panel/localized-weather-panel';
import { HomepageLandingComponent } from './homepage/homepage-landing.component';
import {
  APP_COPY,
  WEATHER_ALERT_POLICY_COPY,
  WEATHER_ALERT_SIGNUP_FRAGMENT,
  type AppCopy,
  type FeaturePage,
  type MeetingItem,
  type SearchItem,
} from './app-copy';
import { buildHomepageMeetings } from './homepage/build-homepage-meetings';
import {
  buildCalendarItems,
  type CalendarItem,
} from './meetings-page/meetings-page.helpers';
import { buildMegaMenuItems } from './shell-nav/build-mega-menu';
import { buildSearchKeywords } from './site-search/build-search-keywords';
import { dedupeSearchItems } from './site-search/dedupe-search-items';
import { scoreSearchItem } from './site-search/score-search-item';

@Component({
  selector: 'app-root',
  imports: [
    NgOptimizedImage,
    NgTemplateOutlet,
    RouterLink,
    DrawerModule,
    ReactiveFormsModule,
    AvatarModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    MegaMenuModule,
    CardModule,
    RouterOutlet,
    HomepageWeatherAlertPrimer,
    WeatherAlertBannerComponent,
    HomepageLandingComponent,
    Ripple,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private static readonly SEARCH_DEBOUNCE_MS = 120;
  /** Homepage notices timeline preview count; show “view all” when `notices.length` exceeds this. */
  private static readonly HOMEPAGE_NOTICES_PREVIEW = 3;

  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly initialPath =
    typeof window !== 'undefined'
      ? normalizeAppRoutePath(`${window.location.pathname}${window.location.search}${window.location.hash}`)
      : normalizeAppRoutePath(this.router.url);
  private readonly initialFragment =
    typeof window !== 'undefined'
      ? window.location.hash.replace(/^#/, '')
      : (this.router.parseUrl(this.router.url).fragment ?? '');
  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => normalizeAppRoutePath(this.router.url)),
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
  protected readonly headerScrolled = signal(false);
  protected readonly sidebarVisible = signal(false);
  protected readonly siteAlertCardPt = {
    header: { class: 'site-alert-header' },
    body: { class: 'site-alert-body' },
    footer: { class: 'site-alert-footer' },
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
  protected readonly cmsContentLoading = this.cmsStore.isLoading;
  protected readonly cmsContentLoadFailed = this.cmsStore.hasLoadFailed;
  protected readonly cmsLoadError = this.cmsStore.loadError;
  protected readonly cmsLoadFallbackDismissed = signal(false);
  private readonly routedFragmentScrollEffect = effect(() => {
    const fragment = this.currentFragment();

    if (!fragment) {
      return;
    }

    if (fragment === WEATHER_ALERT_SIGNUP_FRAGMENT) {
      scheduleFragmentScrollWithRetry(`#${fragment}`);
      return;
    }

    scheduleFragmentScroll(`#${fragment}`);
  });

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
  private readonly siteRouteChrome = computed(() => resolveSiteRouteChrome(this.currentPath()));
  protected readonly isWeatherMode = computed(() => this.siteRouteChrome().isWeatherMode);
  protected readonly isTopLevelLazyRouteMode = computed(
    () => this.siteRouteChrome().isTopLevelLazyRouteMode,
  );
  protected readonly isFeaturePageMode = computed(() => this.siteRouteChrome().isFeaturePageMode);
  protected readonly isNotFoundMode = computed(() => this.siteRouteChrome().isNotFoundMode);
  protected readonly shouldPrimeWeatherAlerts = computed(
    () => this.siteRouteChrome().shouldPrimeWeatherAlerts,
  );
  protected readonly heroContent = this.cmsStore.hero;
  protected readonly cmsAlertBanner = this.cmsStore.alertBanner;
  protected readonly pageTitle = computed(() => this.heroContent().title);
  protected readonly browserTitle = computed(() => {
    const copy = this.appCopy();
    return buildBrowserTitle({
      siteTitle: this.pageTitle()?.trim() || DEFAULT_SITE_TITLE,
      featureTitle: this.currentFeaturePage()?.title,
      isNotFound: this.isNotFoundMode(),
      notFoundBrowserTitle: copy.notFoundBrowserTitle,
    });
  });
  protected readonly browserDescription = computed(() => {
    const copy = this.appCopy();
    const featurePage = this.currentFeaturePage();
    return buildBrowserDescription({
      isNotFound: this.isNotFoundMode(),
      notFoundMetaDescription: copy.notFoundMetaDescription,
      siteMetaDescription: copy.siteMetaDescription,
      featureTitle: featurePage?.title,
      featureSummary: featurePage?.summary,
    });
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
  protected readonly menuItems = computed<MegaMenuItem[]>(() => buildMegaMenuItems(this.appCopy()));

  protected activateMegaMenuItem(item: MegaMenuItem, event: MouseEvent): void {
    if (!item.command) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    item.command(event);
  }

  /**
   * `routerLink` owns a normal click (https://angular.dev/guide/routing/navigate-to-routes).
   * Hydration event replay delivers that click with `defaultPrevented` already set, and
   * `RouterLink` skips it (https://angular.dev/guide/hydration). Navigate only then.
   */
  protected onMegaMenuLeafClick(item: MegaMenuItem, event: MouseEvent): void {
    if (item.command) {
      this.activateMegaMenuItem(item, event);
      return;
    }

    if (item.routerLink == null) {
      return;
    }

    const modifiedClick =
      event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
    if (modifiedClick) {
      return;
    }

    if (!event.defaultPrevented) {
      return;
    }

    event.stopPropagation();

    const commands = Array.isArray(item.routerLink) ? item.routerLink : [item.routerLink];
    const extras =
      item.fragment != null && item.fragment !== '' ? { fragment: item.fragment } : undefined;

    void this.router.navigate(commands, extras);
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
  private readonly logging = inject(LoggingService);

  // Dynamic CMS-backed overrides for frequently changed UI copy (SiteCopy model).
  protected readonly topTasks = computed(() => this.appCopy().topTasks);

  protected readonly featurePages = computed<FeaturePage[]>(() =>
    buildFeaturePages({
      copy: this.appCopy(),
      weatherAlert: this.homepageWeatherAlert(),
      latestNotice: this.notices()[0],
      nextCalendarItem: this.calendarItems()[0],
      primaryContact: this.primaryContact(),
      clerkContact: this.clerkContact(),
      privacyPolicyCopy: this.privacyPolicyCopy(),
      smsTermsCopy: this.smsTermsCopy(),
    }),
  );
  protected readonly currentFeaturePage = computed<FeaturePage | null>(() =>
    findCurrentFeaturePage(this.currentPath(), this.featurePages()),
  );
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
  protected readonly meetings = computed<MeetingItem[]>(() => {
    const copy = this.appCopy();
    const locale = this.siteLanguage() === 'es' ? 'es-US' : 'en-US';

    return buildHomepageMeetings(
      this.liveCalendarEvents(),
      copy.meetings,
      copy,
      locale,
      this.cmsStore.linkedAgendaDocumentByEventId(),
      this.notices().length > App.HOMEPAGE_NOTICES_PREVIEW,
    );
  });
  protected readonly calendarItems = computed<CalendarItem[]>(() => {
    const copy = this.appCopy();
    const locale = this.siteLanguage() === 'es' ? 'es-US' : 'en-US';

    return buildCalendarItems(
      this.liveCalendarEvents(),
      copy.calendarSeeds,
      {
        calendarPublishedEventCategory: copy.calendarPublishedEventCategory,
        calendarEventFallbackDetail: copy.calendarEventFallbackDetail,
        calendarEventFallbackLocation: copy.calendarEventFallbackLocation,
        calendarScheduledEventLabel: copy.calendarScheduledEventLabel,
        calendarGoogleActionLabel: copy.calendarGoogleActionLabel,
        calendarDownloadActionLabel: copy.calendarDownloadActionLabel,
        calendarAgendaActionLabel: copy.calendarAgendaActionLabel,
        calendarAgendaLinkedActionLabel: copy.calendarAgendaLinkedActionLabel,
      },
      locale,
      this.cmsStore.linkedAgendaDocumentByEventId(),
    );
  });
  protected readonly serviceCards = computed(() => this.appCopy().serviceCards);
  protected readonly transparencyActions = computed(() => this.appCopy().transparencyActions);
  protected readonly accessibilityItems = computed(() => this.appCopy().accessibilityItems);
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
        keywords: buildSearchKeywords(
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
      keywords: buildSearchKeywords(task.description, task.note),
    }));
  });
  private readonly meetingSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.meetings().map((meeting) => ({
      title: meeting.title,
      summary: meeting.format,
      category: copy.meetingsKicker,
      href: '/meetings',
      keywords: buildSearchKeywords(
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
      keywords: buildSearchKeywords(
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
        keywords: buildSearchKeywords(document.format, ...document.keywords),
      }));
  });
  private readonly serviceSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.serviceCards().map((service) => ({
      title: service.title,
      summary: service.description,
      category: copy.servicesKicker,
      href: service.href,
      keywords: buildSearchKeywords(service.availability, service.cta),
    }));
  });
  private readonly transparencySearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.transparencyActions().map((action) => ({
      title: action.title,
      summary: action.detail,
      category: copy.transparencyKicker,
      href: action.href,
      keywords: buildSearchKeywords(action.detail),
    }));
  });
  private readonly noticeSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.notices().map((notice) => ({
      title: notice.title,
      summary: notice.detail,
      category: copy.noticesKicker,
      href: `/news#${cmsNoticeFragmentId(notice.id)}`,
      keywords: buildSearchKeywords(notice.date),
    }));
  });
  private readonly contactSearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.contacts().map((contact) => ({
      title: contact.value ? `${contact.label}: ${contact.value}` : contact.label,
      summary: contact.detail,
      category: copy.contactKicker,
      href: contact.href ?? '/contact',
      keywords: buildSearchKeywords(contact.label, contact.value, contact.linkLabel),
    }));
  });
  private readonly accessibilitySearchItems = computed<SearchItem[]>(() => {
    const copy = this.appCopy();

    return this.accessibilityItems().map((item) => ({
      title: item.title,
      summary: item.detail,
      category: copy.accessibilityKicker,
      href: '/accessibility',
      keywords: buildSearchKeywords(item.detail),
    }));
  });
  private readonly featurePageSearchItems = computed<SearchItem[]>(() => {
    return this.featurePages().map((page) => ({
      title: page.title,
      summary: page.summary,
      category: page.kicker || 'Features',
      href: page.href,
      keywords: buildSearchKeywords(page.title, page.summary, page.kicker || ''),
    }));
  });
  protected readonly searchIndex = computed<SearchItem[]>(() => {
    return dedupeSearchItems([
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
  protected readonly hasSearchQuery = computed(() => this.normalizedSearchQuery().length > 0);
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
      return [];
    }

    const terms = this.searchTerms();

    return searchIndex
      .map((item) => ({
        item,
        score: scoreSearchItem(item, terms, query),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ item }) => item);
  });

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

  protected performSearch(event?: Event): void {
    event?.preventDefault();

    const query = this.siteSearchForm.controls.query.value.trim();

    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
      this.searchDebounceHandle = null;
    }

    this.searchQuery.set(query);

    if (!query) {
      this.revealHomepageSearchHelp();
      return;
    }

    const firstResult = this.searchResults()[0];

    if (!firstResult) {
      return;
    }

    const [path, fragment] = firstResult.href.split('#');
    this.router.navigate([path], { fragment: fragment || undefined });
  }

  /** Empty submit on the homepage can offer chips; feature pages have no `#search-panel`. */
  private revealHomepageSearchHelp(): void {
    if (this.isFeaturePageMode() || this.isNotFoundMode()) {
      return;
    }
    scrollToFragment('#search-panel');
  }

  protected trackAlertSignupClick(): void {
    this.logging.buttonClick('alert-signup');
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
      scheduleFragmentScrollWithRetry(`#${anchorId}`);
    });
  }

  protected updateSiteLanguage(value: SiteLanguage): void {
    this.logging.buttonClick(`language-${value}`);
    this.siteLanguageService.setLanguage(value);
  }

}
