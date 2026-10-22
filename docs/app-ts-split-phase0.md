# app.ts split — Phase 0 inventory

**Date:** 2026-10-22  
**Scope:** Analysis only (no runtime behavior change).  
**Sources:** `src/app/app.ts` (~3,376 lines), `src/app/app.html`, `src/app/app.spec.ts`.  
**Method:** Template bindings (`name(`, `[pt]`, `{{ name }}`), `this.` / `App.` references, spec mentions, then manual review of effects/DI/stubs.

## Executive summary

| Disposition | Count | Meaning |
| --- | ---: | --- |
| **KEEP** | 73 | Stay on shell for now (or move only with Phase 3 shell helpers) |
| **MOVE** | 78 | Extract in Phases 1–3 without behavior change |
| **DELETE-CANDIDATE** | 33 | Confirm unused, then remove in Phase 5 (not Phase 1) |
| **Pre-class exports** | 5 | Move in **Phase 1** (copy / policy) |

### Recommended PR sequence

1. **Phase 1** — Extract `APP_COPY` / `AppCopy` / `WEATHER_ALERT_POLICY_COPY` / `LeadershipGroup` / signup fragment SSOT.
2. **Phase 2** — Pure mega-menu + search-index helpers; homepage `meetings()` preview only.
3. **Phase 3** — Route-mode + fragment/header/meta shell helpers.
4. **Phase 4** — Optional homepage section components.
5. **Phase 5** — Delete confirmed orphans (especially shell calendar table/help API).

### Critical findings

1. **Homepage does not bind** FullCalendar `calendarOptions`, calendar table state, or calendar help UI. That surface is leftover from when meetings lived in the shell. Prefer `meetings-page/meetings-page.helpers.ts` for calendar logic.
2. **`WEATHER_ALERT_SIGNUP_FRAGMENT` is duplicated** in `weather-panel/localized-weather-panel.ts` — consolidate in Phase 1.
3. Several **route stubs** (`isRecordsMode`, `isDocumentHubMode`) are hard-coded `false` after redirects moved to `app.routes.ts`.
4. **`cmsNoticeLinkAriaLabel`** became unused after Wave 2 a11y (aria-labels removed from notice cards).

---

## Pre-class exports (Phase 1 priority)

| Line | Export | Disposition | Target |
| ---: | --- | --- | --- |
| 222 | `LeadershipGroup` | MOVE Phase 1 | `app-copy/app-copy.types.ts` (used by contact-page) |
| 273 | `AppCopy` | MOVE Phase 1 | `app-copy/app-copy.types.ts` |
| 493 | `WEATHER_ALERT_POLICY_COPY` | MOVE Phase 1 | `app-copy/weather-alert-policy-copy.ts` |
| 630 | `APP_COPY` | MOVE Phase 1 | `app-copy/app-copy.ts` (~914 lines) |
| 1558 | `WEATHER_ALERT_SIGNUP_FRAGMENT` | MOVE Phase 1 | Single SSOT; re-export from weather-panel |
| 623 | `normalizePath` | MOVE Phase 3 | With `site-route-mode` |
| 1561 | `megaMenuColumn` | MOVE Phase 2 | With `build-mega-menu.ts` |

### Pre-class types (move with the export that needs them)

| Line | Declaration |
| ---: | --- |
| 89 | `interface NavLink {` |
| 95 | `interface PrimaryNavLink {` |
| 101 | `interface TopTask {` |
| 108 | `interface MeetingItem {` |
| 124 | `interface CalendarAction {` |
| 132 | `interface CalendarItem {` |
| 152 | `interface CalendarEventSeed {` |
| 167 | `interface CalendarOverview {` |
| 175 | `type CalendarTableSortField = 'title' | 'date' | 'category' | 'location' | 'recurrence';` |
| 177 | `interface CalendarTableState {` |
| 184 | `interface ServiceCard {` |
| 192 | `interface TransparencyItem {` |
| 197 | `interface TransparencyAction {` |
| 203 | `interface AccessibilityItem {` |
| 208 | `interface PolicyItem {` |
| 213 | `interface PolicyPageCopy {` |
| 222 | `export interface LeadershipGroup {` |
| 232 | `interface SearchItem {` |
| 240 | `interface CommunityFact {` |
| 246 | `type FeaturePageId =` |
| 262 | `type FeatureTitles = Record<FeaturePageId, string>;` |
| 264 | `interface FeaturePage {` |
| 273 | `export interface AppCopy {` |

## KEEP — shell / Phase 3 extract (73)

| Line | Kind | Member | Phase / target | Notes |
| ---: | --- | --- | --- | --- |
| 1613 | inject/field | `cmsStore` | Phase 1–2 home | Used internally (15 refs) |
| 1614 | inject/field | `siteLanguageService` | Phase 1–2 home | Used internally (5 refs) |
| 1743 | inject/field | `siteSearchForm` | Phase 2 search | Used internally (5 refs) |
| 1747 | inject/field | `siteSearchDraftValue` | Phase 2 search | Used internally (1 refs) |
| 1618 | inject/field | `mainContent` | Phase 2–3 | Used internally (1 refs) |
| 1620 | inject/field | `platformId` | Phase 2–3 | Used internally (1 refs) |
| 2180 | inject/field | `logging` | Phase 2–3 | Used internally (4 refs) |
| 1615 | inject/field | `router` | Phase 3 routes | Used internally (21 refs) |
| 1633 | inject/field | `currentPath` | Phase 3 routes | Used internally (20 refs) |
| 1616 | inject/field | `title` | Phase 3 shell | Used internally (1 refs) |
| 1617 | inject/field | `meta` | Phase 3 shell | Used internally (7 refs) |
| 1619 | inject/field | `headerEl` | Phase 3 shell | viewChild used by headerScrollEffect |
| 1641 | inject/field | `currentFragment` | Phase 3 shell | Used internally (4 refs) |
| 1705 | effect | `routedFragmentScrollEffect` | Phase 3 shell | Side-effect wiring (0 refs) |
| 2334 | effect | `pageViewLoggingEffect` | Phase 3 shell | Side-effect wiring (0 refs) |
| 2341 | effect | `browserMetadataEffect` | Phase 3 shell | Side-effect wiring (0 refs) |
| 2354 | effect | `headerScrollEffect` | Phase 3 shell | Side-effect wiring (0 refs) |
| 1607 | static | `DEFAULT_SITE_TITLE` | shell | App.DEFAULT_SITE_TITLE used 1× |
| 1608 | static | `MAX_META_DESCRIPTION_LENGTH` | shell | App.MAX_META_DESCRIPTION_LENGTH used 2× |
| 1609 | static | `SEARCH_DEBOUNCE_MS` | shell | App.SEARCH_DEBOUNCE_MS used 1× |
| 1611 | static | `HOMEPAGE_NOTICES_PREVIEW` | shell | App.HOMEPAGE_NOTICES_PREVIEW used 2× |
| 1622 | inject/field | `offlineConnectivityNotifier` | shell | DI for connectivity side effects |
| 1652 | signal | `headerScrolled` | shell (template) | Bound in app.html |
| 1653 | signal | `sidebarVisible` | shell (template) | Bound in app.html |
| 1655 | field | `siteAlertCardPt` | shell (template) | Bound in app.html |
| 1665 | field | `taskCardPt` | shell (template) | Bound in app.html |
| 1672 | field | `desktopMegaMenuPt` | shell (template) | Bound in app.html |
| 1690 | field | `mobileDrawerPt` | shell (template) | Bound in app.html |
| 1700 | field | `cmsContentLoading` | shell (template) | Bound in app.html |
| 1701 | field | `cmsContentLoadFailed` | shell (template) | Bound in app.html |
| 1703 | field | `cmsLoadError` | shell (template) | Bound in app.html |
| 1704 | signal | `cmsLoadFallbackDismissed` | shell (template) | Bound in app.html |
| 1762 | signal | `homepageWeatherAlert` | shell (template) | Bound in app.html |
| 1763 | signal | `nwsBannerDismissed` | shell (template) | Bound in app.html |
| 1765 | field | `currentYear` | shell (template) | Bound in app.html |
| 1773 | computed | `isWeatherMode` | shell (template) | Bound in app.html |
| 1791 | computed | `isTopLevelLazyRouteMode` | shell (template) | Bound in app.html |
| 1798 | computed | `isFeaturePageMode` | shell (template) | Bound in app.html |
| 1813 | computed | `isNotFoundMode` | shell (template) | Bound in app.html |
| 1826 | computed | `shouldPrimeWeatherAlerts` | shell (template) | Bound in app.html |
| 1833 | field | `heroContent` | shell (template) | Bound in app.html |
| 1835 | computed | `pageTitle` | shell (template) | Bound in app.html |
| 1869 | field | `siteLanguage` | shell (template) | Bound in app.html |
| 1870 | field | `weatherAlertSignupFragment` | shell (template) | Bound in app.html (`[fragment]`) |
| 1871 | computed | `appCopy` | shell (template) | Bound in app.html |
| 1876 | computed | `menuItems` | shell (template) | Bound in app.html |
| 2051 | method | `activateMegaMenuItem` | shell (template) | Bound in app.html |
| 2080 | method | `onMegaMenuLeafClick` | shell (template) | Bound in app.html |
| 2119 | computed | `languageChoices` | shell (template) | Bound in app.html |
| 2139 | computed | `primaryContact` | shell (template) | Bound in app.html |
| 2153 | computed | `alertBanner` | shell (template) | Bound in app.html |
| 2191 | computed | `topTasks` | shell (template) | Bound in app.html |
| 2194 | computed | `topTasksKicker` | shell (template) | Bound in app.html |
| 2195 | computed | `topTasksHeading` | shell (template) | Bound in app.html |
| 2370 | computed | `homepageNotices` | shell (template) | Bound in app.html |
| 2373 | field | `cmsNoticeCardLink` | shell (template) | Bound in app.html |
| 2377 | method | `noticeExternalCta` | shell (template) | Bound in app.html |
| 2380 | method | `externalLinkNewTabHint` | shell (template) | Bound in app.html |
| 2383 | computed | `meetings` | shell (template) | Bound in app.html |
| 2657 | computed | `hasSearchQuery` | shell (template) | Bound in app.html |
| 2658 | computed | `isSearchPending` | shell (template) | Bound in app.html |
| 2666 | method | `focusMainContent` | shell (template) | Bound in app.html |
| 2680 | computed | `searchResults` | shell (template) | Bound in app.html |
| 2719 | method | `resolveAppLink` | shell (template) | Bound in app.html |
| 2739 | method | `performSearch` | shell (template) | Bound in app.html |
| 2872 | method | `trackAlertSignupClick` | shell (template) | Bound in app.html |
| 2892 | method | `openMobileMenu` | shell (template) | Bound in app.html |
| 2896 | method | `closeMobileMenu` | shell (template) | Bound in app.html |
| 2900 | method | `retryCmsContent` | shell (template) | Bound in app.html |
| 2905 | method | `dismissCmsLoadFallbackNotice` | shell (template) | Bound in app.html |
| 2939 | method | `updateHomepageWeatherAlert` | shell (template) | Bound in app.html |
| 2948 | method | `onNwsBannerSignup` | shell (template) | Bound in app.html |
| 2956 | method | `updateSiteLanguage` | shell (template) | Bound in app.html |

## MOVE — Phases 1–3 (78)

| Line | Kind | Member | Phase / target | Notes |
| ---: | --- | --- | --- | --- |
| 1764 | field | `lastHomepageWeatherAlertDismissKey` | Phase 1–2 home | cms/home/copy; 2 internal refs |
| 1834 | field | `cmsAlertBanner` | Phase 1–2 home | cms/home/copy; 1 internal refs |
| 1866 | field | `notices` | Phase 1–2 home | cms/home/copy; 4 internal refs; tested in app.spec |
| 2113 | computed | `privacyPolicyCopy` | Phase 1–2 home | cms/home/copy; 1 internal refs |
| 2116 | computed | `smsTermsCopy` | Phase 1–2 home | cms/home/copy; 1 internal refs |
| 2185 | method | `getDynamicLabel` | Phase 1–2 home | CMS label override helper — keep until site-copy path clear |
| 1754 | computed | `searchDraftQuery` | Phase 2 search | site-search-index / score; 1 internal refs |
| 1755 | signal | `searchQuery` | Phase 2 search | site-search-index / score; 4 internal refs |
| 2492 | computed | `weatherSearchKeywords` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2497 | computed | `weatherSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2517 | computed | `topTaskSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2577 | computed | `serviceSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2588 | computed | `transparencySearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2599 | computed | `noticeSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2610 | computed | `contactSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2621 | computed | `accessibilitySearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2632 | computed | `featurePageSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2641 | computed | `searchIndex` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2656 | computed | `normalizedSearchQuery` | Phase 2 search | site-search-index / score; 4 internal refs |
| 2661 | computed | `searchTerms` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2664 | field | `searchDebounceHandle` | Phase 2 search | site-search-index / score; 8 internal refs |
| 2702 | method | `applySearchDraft` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2767 | method | `revealHomepageSearchHelp` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2774 | method | `scoreSearchItem` | Phase 2 search | site-search-index / score; 1 internal refs |
| 2961 | method | `buildSearchKeywords` | Phase 2 search | site-search-index / score; 11 internal refs |
| 2965 | method | `dedupeSearchItems` | Phase 2 search | site-search-index / score; 1 internal refs |
| 1649 | signal | `calendarJumpMonth` | Phase 2/5 calendar | calendar leftover / meetings preview; 2 internal refs |
| 1650 | signal | `meetingsTab` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 1651 | signal | `calendarHelpVisible` | Phase 2/5 calendar | calendar leftover / meetings preview; 2 internal refs |
| 1694 | signal | `calendarTableState` | Phase 2/5 calendar | calendar leftover / meetings preview; 7 internal refs |
| 1774 | computed | `isMeetingsMode` | Phase 2/5 calendar | calendar leftover / meetings preview; 2 internal refs |
| 1867 | field | `liveCalendarEvents` | Phase 2/5 calendar | calendar leftover / meetings preview; 3 internal refs |
| 2415 | computed | `calendarItems` | Phase 2/5 calendar | calendar leftover / meetings preview; 5 internal refs; tested in app.spec |
| 2427 | computed | `calendarTableTotalRecords` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 2428 | computed | `calendarTableFirst` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 2528 | computed | `meetingSearchItems` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 2544 | computed | `calendarSearchItems` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 2562 | computed | `meetingDocumentsSearchItems` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3087 | method | `createCalendarItem` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3128 | method | `createMeetingItemFromEvent` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3154 | method | `createCalendarItemFromEvent` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3203 | method | `createGoogleCalendarLink` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3207 | method | `createIcsLink` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3211 | method | `createGoogleCalendarLinkFromEvent` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3222 | method | `createIcsLinkFromEvent` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3233 | method | `resolveCalendarEventEnd` | Phase 2/5 calendar | calendar leftover / meetings preview; 3 internal refs |
| 3248 | method | `sortCalendarItems` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3276 | method | `getCalendarSortValue` | Phase 2/5 calendar | calendar leftover / meetings preview; 2 internal refs |
| 3294 | method | `toCalendarTableSortField` | Phase 2/5 calendar | calendar leftover / meetings preview; 1 internal refs |
| 3313 | method | `parseCalendarSeedDate` | Phase 2/5 calendar | calendar leftover / meetings preview; 3 internal refs |
| 3332 | method | `formatCalendarEventDate` | Phase 2/5 calendar | calendar leftover / meetings preview; 3 internal refs |
| 1868 | field | `contacts` | Phase 2–3 | shell wiring; 5 internal refs; tested in app.spec |
| 2146 | computed | `clerkContact` | Phase 2–3 | shell wiring; 1 internal refs |
| 2484 | computed | `serviceCards` | Phase 2–3 | shell wiring; 1 internal refs |
| 2489 | computed | `transparencyActions` | Phase 2–3 | shell wiring; 1 internal refs |
| 2490 | computed | `accessibilityItems` | Phase 2–3 | shell wiring; 1 internal refs |
| 1625 | field | `initialPath` | Phase 3 routes | site-route-mode; 2 internal refs |
| 1766 | computed | `isAdminMode` | Phase 3 routes | site-route-mode; 2 internal refs |
| 1767 | computed | `isAdminLoginMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1771 | computed | `isClerkSetupMode` | Phase 3 routes | site-route-mode; 2 internal refs |
| 1775 | computed | `isServicesMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1777 | computed | `isContactMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1778 | computed | `isAccessibilityMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1779 | computed | `isPrivacyMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1780 | computed | `isTermsMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1781 | computed | `isBusinessesMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1782 | computed | `isHistoryMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1784 | computed | `isNewsMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 1788 | computed | `isPaymentsMode` | Phase 3 routes | site-route-mode; 1 internal refs |
| 2197 | computed | `featurePages` | Phase 3 routes | site-route-mode; 4 internal refs |
| 2327 | computed | `currentFeaturePage` | Phase 3 routes | site-route-mode; 3 internal refs |
| 1629 | field | `initialFragment` | Phase 3 shell | shell helpers; 2 internal refs |
| 1836 | computed | `browserTitle` | Phase 3 shell | shell helpers; 1 internal refs |
| 1851 | computed | `browserDescription` | Phase 3 shell | shell helpers; 1 internal refs |
| 3021 | method | `scheduleFragmentScroll` | Phase 3 shell | shell helpers; 2 internal refs |
| 3034 | method | `scheduleFragmentScrollWithRetry` | Phase 3 shell | shell helpers; 2 internal refs |
| 3056 | method | `scrollToFragment` | Phase 3 shell | shell helpers; 6 internal refs |
| 3369 | method | `truncateMetaDescription` | Phase 3 shell | shell helpers; 2 internal refs |

## DELETE-CANDIDATE — Phase 5 only (33)

| Line | Kind | Member | Phase / target | Notes |
| ---: | --- | --- | --- | --- |
| 2045 | method | `buildMenuUrl` | Phase 2 nav | No template or internal refs found |
| 2062 | method | `megaMenuLeafHref` | Phase 2 nav | No template or internal refs found |
| 2109 | method | `navigateTo` | Phase 2 nav | No template or internal refs found |
| 2980 | method | `navigateToHref` | Phase 2 nav | No template or internal refs found |
| 1720 | computed | `calendarOptions` | Phase 2/5 calendar | Only referenced from app.spec (no template/internal use) |
| 2441 | computed | `calendarTableRows` | Phase 2/5 calendar | No template or internal refs found |
| 2442 | computed | `calendarTableSortField` | Phase 2/5 calendar | No template or internal refs found |
| 2445 | computed | `calendarTableSortOrder` | Phase 2/5 calendar | No template or internal refs found |
| 2448 | computed | `calendarTableItems` | Phase 2/5 calendar | No template or internal refs found |
| 2455 | computed | `calendarOverview` | Phase 2/5 calendar | No template or internal refs found |
| 2700 | field | `trackCalendarRow` | Phase 2/5 calendar | No template or internal refs found |
| 2876 | method | `openCalendar` | Phase 2/5 calendar | No template or internal refs found |
| 2888 | method | `updateCalendarJumpMonth` | Phase 2/5 calendar | No template or internal refs found |
| 2909 | method | `updateCalendarTable` | Phase 2/5 calendar | No template or internal refs found |
| 2927 | method | `updateMeetingsTab` | Phase 2/5 calendar | No template or internal refs found |
| 2931 | method | `openCalendarHelp` | Phase 2/5 calendar | No template or internal refs found |
| 2935 | method | `closeCalendarHelp` | Phase 2/5 calendar | No template or internal refs found |
| 3309 | method | `parseCalendarSeedTimestamp` | Phase 2/5 calendar | No template or internal refs found |
| 3360 | method | `formatCalendarMonth` | Phase 2/5 calendar | No template or internal refs found |
| 2723 | method | `isCurrentRouteLink` | Phase 3 routes | No template or internal refs found |
| 1624 | inject/field | `googleAnalytics` | Phase 5 | Injected but unread (page views use LoggingService) |
| 1654 | computed | `mobileMenuItems` | Phase 5 | Unused alias of menuItems(); drawer uses menuItems() |
| 1660 | field | `supportCardPt` | Phase 5 | Not bound in app.html |
| 1702 | field | `cmsUsingCachedSnapshot` | Phase 5 | Exposed but unused in template |
| 1772 | computed | `isDocumentHubMode` | Phase 5 | Always false stub |
| 1776 | computed | `isRecordsMode` | Phase 5 | Always false stub; route redirects elsewhere |
| 2123 | computed | `primaryNavLinks` | Phase 5 | Unused; mega-menu replaced primary nav |
| 2179 | computed | `communityFacts` | Phase 5 | Computed unused in template (copy still has data) |
| 2324 | computed | `homepageFeaturePages` | Phase 5 | Unused in template |
| 2374 | method | `cmsNoticeLinkAriaLabel` | Phase 5 | Orphan after Wave 2 removed template aria-labels |
| 2485 | computed | `transparencyItems` | Phase 5 | Unused on shell |
| 2486 | computed | `transparencyActionsLabel` | Phase 5 | Unused on shell |
| 2491 | computed | `leadershipGroups` | Phase 5 | Unused on shell; contact-page builds its own |

## Phase 1 file map (next implementation PR)

```text
src/app/app-copy/
  app-copy.types.ts
  app-copy.ts
  weather-alert-policy-copy.ts
  weather-alert-signup-fragment.ts
src/app/app.ts   # stop owning copy data; update imports or thin re-export for one PR
```

**Known import update sites:** `contact-page`, `meetings-page` (+ spec), `privacy-page`, `terms-page`,
`accessibility-page`, `history-page`, `site-copy-overrides` (+ vitest), `app.spec.ts`.

## Verification for this Phase 0 PR

- Documentation only under `docs/app-ts-split-phase0.md`.
- Site CI green; no production asset changes.

## Out of scope

- No file moves, deletions, or template edits in this PR.

