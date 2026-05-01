export const siteContent = {
  documentTitle: 'Town of Wiley | Official Website',
  heading: 'Town of Wiley',
  heroActionLabels: {
    topTasks: 'Quick Tasks',
    calendar: 'Open the full town calendar',
    alerts: 'Sign up for text or email alerts',
  },
  topTaskHeadings: [
    'Pay utility bill',
    'Report a street or utility issue',
    'Find a meeting or agenda',
    'Request records, permits, or clerk help',
  ],
  communityFactLabels: ['Town profile', 'Location', 'Regional access'],
  /** English mega menu root labels (matches `APP_COPY.en` in `app.ts`). */
  megaMenuRootLabelsEn: [
    'I Want To...',
    'Government & Meetings',
    'Services & Permits',
    'News, Notices & Alerts',
    'Businesses & Community',
    'Contact & Town Hall',
  ],
  serviceLabels: [
    'Online payments',
    'Street, utility, and property issue reporting',
    'Permits and licenses',
    'Weather, utility, and emergency alerts',
    'Language access for critical services',
    'Search and document discovery',
  ],
  homepageCounts: {
    noticeCards: 3,
    meetingCards: 3,
    serviceCards: 6,
    headerShortcuts: 3,
  },
  searchMatches: {
    payments: 'Pay utility bill',
    issues: 'Report a street or utility issue',
    meetings: 'City Council Regular Meeting',
    calendar: 'Meetings and Calendar',
    packets: 'Find meeting packets and approved minutes',
    council: 'Deb Dillon',
    accessibility: 'Keyboard and screen-reader support',
    clerk: 'City Clerk',
    businesses: 'Business Directory',
    news: 'Town News',
  },
  emptySearchMessage:
    'No direct match yet. Try permits, taxes, meetings, utilities, records, weather, or road issues.',

  // Expanded test data for full functional validation (navigation, buttons, colors, fonts, theme)
  buttonLabels: {
    alerts: 'Sign up for text or email alerts',
    calendar: 'Open the full town calendar',
    topTasks: 'Quick Tasks',
    languageEs: 'ES',
    languageEn: 'EN',
    visitWebsite: 'Visit Website',
  },
  featureHubHeading: 'Open the town section you need',
  expectedStyles: {
    civicBlue: 'rgb(19, 36, 62)',
    heroText: 'rgb(255, 255, 255)',
    headingFont: '"Fraunces", Georgia, serif',
    bodyFont: '"Source Sans 3", "Segoe UI", sans-serif',
    primaryButtonBg: 'rgb(19, 59, 99)', // from --civic-blue
  },
  cmsHeadings: {
    news: 'Town News and Announcements',
    businesses: 'Wiley Community Business Directory',
    documentsHub: 'Public meeting, finance, and code documents',
  },
};
