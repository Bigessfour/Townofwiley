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
    primaryAction: (page) => page.getByRole('link', { name: /Explore resident services/i }),
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
    heading: /Council meetings & schedules/i,
    primaryAction: (page) => page.locator('#calendar'),
  },
  {
    path: '/services',
    label: 'services page',
    heading: /Town services in one place/i,
    primaryAction: (page) => page.getByRole('button', { name: /Pay bill, Utilities/i }),
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
    path: '/pay-bill',
    label: 'pay bill page',
    heading: /Pay Your Utility Bill Online/i,
    primaryAction: (page) => page.getByRole('button', { name: /Submit request/i }),
  },
  {
    path: '/permits',
    label: 'permits page',
    heading: /Permits & Inquiries/i,
    primaryAction: (page) => page.locator('.permits-page a.back-link'),
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
    heading: /Phone, email, and next steps/i,
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
