import type { AppCopy, FeaturePage, PolicyPageCopy } from '../app-copy';
import type { CmsContact, CmsNotice } from '../site-cms-content';
import type { HomepageWeatherAlert } from '../weather-panel/localized-weather-panel';

/** Minimal calendar preview fields for feature-page meta summaries. */
export interface FeaturePageCalendarPreview {
  title: string;
  date: string;
}

export interface BuildFeaturePagesInput {
  copy: AppCopy;
  weatherAlert: HomepageWeatherAlert | null;
  latestNotice: CmsNotice | undefined;
  nextCalendarItem: FeaturePageCalendarPreview | undefined;
  primaryContact: CmsContact | null | undefined;
  clerkContact: CmsContact | null | undefined;
  privacyPolicyCopy: PolicyPageCopy;
  smsTermsCopy: PolicyPageCopy;
}

/** Feature-page catalog used for meta titles, search, and route chrome. */
export function buildFeaturePages(input: BuildFeaturePagesInput): FeaturePage[] {
  const {
    copy,
    weatherAlert,
    latestNotice,
    nextCalendarItem,
    primaryContact,
    clerkContact,
    privacyPolicyCopy,
    smsTermsCopy,
  } = input;

  return [
    {
      id: 'weather',
      kicker: weatherAlert ? copy.nwsAlertLabel : copy.featureTitles.weather,
      title: copy.featureTitles.weather,
      summary: weatherAlert
        ? [weatherAlert.event, weatherAlert.headline].filter(Boolean).join('. ')
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
      href: '/news',
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
      kicker: privacyPolicyCopy.kicker,
      title: copy.featureTitles.privacy,
      summary: copy.privacySummary,
      href: '/privacy',
      showOnHomepage: false,
    },
    {
      id: 'terms',
      kicker: smsTermsCopy.kicker,
      title: copy.featureTitles.terms,
      summary: copy.termsSummary,
      href: '/terms',
      showOnHomepage: false,
    },
    {
      id: 'businesses',
      kicker: copy.featureTitles.businesses,
      title: copy.featureTitles.businesses,
      summary: copy.businessesFeatureSummary,
      href: '/businesses',
      showOnHomepage: false,
    },
    {
      id: 'history',
      kicker: copy.historyKicker,
      title: copy.featureTitles.history,
      summary: copy.historyFeatureSummary,
      href: '/history',
      showOnHomepage: false,
    },
    {
      id: 'news',
      kicker: copy.featureTitles.news,
      title: copy.featureTitles.news,
      summary: copy.newsFeatureSummary,
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
}
