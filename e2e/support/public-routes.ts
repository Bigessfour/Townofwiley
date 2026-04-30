import type { Locator, Page } from '@playwright/test';

export interface PublicRouteContract {
  path: string;
  label: string;
  heading: string | RegExp;
  standardShell?: boolean;
  primaryAction?: (page: Page) => Locator;
}

export const publicRouteContracts: PublicRouteContract[] = [
  {
    path: '/',
    label: 'landing page',
    heading: 'Town of Wiley',
    primaryAction: (page) =>
      page.getByLabel(/Find permits, taxes, meetings, utilities, records, and issue reporting/i),
  },
  {
    path: '/weather',
    label: 'weather page',
    heading: /National Weather Service forecast/i,
    primaryAction: (page) => page.getByRole('button', { name: 'Refresh forecast' }),
  },
  {
    path: '/notices',
    label: 'notices page',
    heading: /News & Announcements/i,
    primaryAction: (page) => page.locator('.notice-card').first(),
  },
  {
    path: '/meetings',
    label: 'meetings page',
    heading: /Meeting access and community updates/i,
    primaryAction: (page) => page.getByRole('link', { name: 'Open calendar' }),
  },
  {
    path: '/services',
    label: 'services page',
    heading: /Start common town services online/i,
    primaryAction: (page) => page.getByRole('button', { name: /Pay utility bill/i }),
  },
  {
    path: '/records',
    label: 'records page',
    heading: /document destinations/i,
    primaryAction: (page) => page.getByRole('link', { name: 'Open meeting documents destination' }),
  },
  {
    path: '/documents',
    label: 'documents page',
    heading: 'Public meeting, finance, and code documents',
    standardShell: false,
    primaryAction: (page) => page.getByRole('link', { name: 'Open document' }).first(),
  },
  {
    path: '/businesses',
    label: 'businesses page',
    heading: 'Wiley Community Business Directory',
    primaryAction: (page) => page.getByLabel('Search local businesses'),
  },
  {
    path: '/news',
    label: 'news page',
    heading: 'Town News and Announcements',
    primaryAction: (page) => page.getByRole('link', { name: 'Read article' }).first(),
  },
  {
    path: '/contact',
    label: 'contact page',
    heading: /Residents should always know where to go next/i,
    primaryAction: (page) => page.locator('.contact-link[href^="mailto:"]').first(),
  },
  {
    path: '/accessibility',
    label: 'accessibility page',
    heading: /Every resident should be able to use this website/i,
    primaryAction: (page) => page.locator('#barrier-report .accessibility-action'),
  },
  {
    path: '/privacy',
    label: 'privacy page',
    heading: 'Weather alert privacy notice',
    primaryAction: (page) => page.getByRole('link', { name: 'Weather alert SMS terms' }),
  },
  {
    path: '/terms',
    label: 'terms page',
    heading: 'Weather alert SMS terms',
    primaryAction: (page) => page.getByRole('link', { name: /Weather alert privacy/i }),
  },
];

export const accessibilityRouteContracts = publicRouteContracts;
