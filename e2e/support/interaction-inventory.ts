/**
 * Canonical interaction IDs from docs/SITE_INTERACTION_INVENTORY_AND_TESTING.md.
 * Each id must have a matching Playwright test title in e2e/specs/inventory/.
 */
export const interactionInventoryIds = [
  // Shared chrome (per public route)
  'shared.skip-to-content',
  'shared.language-switcher',
  'shared.site-search',
  'shared.chatbot-toggle',
  'shared.logo-navigate-home',
  'shared.megamenu-root-navigate-businesses',
  'shared.megamenu-root-navigate-contact',
  'shared.mobile-menu-toggle',
  'shared.footer-accessibility-link',

  // Homepage-only
  'home.quick-tasks-pay-bill',
  'home.quick-tasks-meetings',
  'home.hero-explore-services',
  'home.feature-card-weather',
  'home.feature-card-notices',
  'home.notice-card-navigate',
  'home.notice-card-link',
  'home.meeting-card-navigate',
  'home.weather-signup-teaser',
  'home.site-alert-cta',

  // Documents redirect (/documents → /meetings archive)
  'documents.meetings-archive-visible',

  // Weather
  'weather.signup-form-submit',
  'weather.refresh-forecast',

  // Pay bill
  'pay-bill.paystar-portal-cta',
  'pay-bill.billing-intake-validation',

  // Contact
  'contact.mailto-link',

  // Meetings
  'meetings.calendar-visible',
  'meetings.meeting-rows-visible',

  // Services
  'services.payment-panel-toggle',
  'services.issue-report-panel',

  // Records redirect (/records → /contact)
  'records.redirect-contact-assistance',

  // Businesses
  'businesses.directory-search',

  // News
  'news.read-article-link',

  // Notices
  'notices.cards-visible',

  // Static pages
  'accessibility.barrier-report-action',
  'privacy.sms-terms-anchor',
  'terms.privacy-anchor-link',
] as const;

export type InteractionInventoryId = (typeof interactionInventoryIds)[number];
