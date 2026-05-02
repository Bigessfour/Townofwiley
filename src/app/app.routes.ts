import { Routes } from '@angular/router';
import { App } from './app';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./cms-admin/cms-admin').then((m) => m.CmsAdmin),
  },
  {
    path: 'clerk-setup',
    loadComponent: () =>
      import('./clerk-setup/clerk-setup-redirect').then((m) => m.ClerkSetupRedirect),
  },
  {
    path: 'documents',
    loadComponent: () => import('./document-hub/document-hub').then((m) => m.DocumentHub),
  },
  {
    path: 'notices',
    loadComponent: () => import('./notices-page/notices-page').then((m) => m.NoticesPage),
  },
  {
    path: 'meetings',
    loadComponent: () => import('./meetings-page/meetings-page').then((m) => m.MeetingsPage),
  },
  {
    path: 'weather',
    loadComponent: () =>
      import('./weather-panel/localized-weather-panel').then((m) => m.LocalizedWeatherPanel),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./resident-services/resident-services').then((m) => m.ResidentServices),
  },
  {
    path: 'records',
    loadComponent: () => import('./records-center/records-center').then((m) => m.RecordsCenter),
  },
  {
    path: 'businesses',
    loadComponent: () =>
      import('./business-directory/business-directory').then((m) => m.BusinessDirectory),
  },
  {
    path: 'pay-bill',
    loadComponent: () =>
      import('./pay-bill/pay-bill-page.component').then((m) => m.PayBillPageComponent),
  },
  {
    path: 'payments',
    redirectTo: 'pay-bill',
    pathMatch: 'full',
  },
  {
    path: 'permits',
    loadComponent: () => import('./permits/permits.component').then((m) => m.PermitsComponent),
  },
  {
    path: 'news',
    loadComponent: () => import('./news/news').then((m) => m.News),
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact-page/contact-page').then((m) => m.ContactPage),
  },
  {
    path: 'accessibility',
    loadComponent: () =>
      import('./accessibility-page/accessibility-page').then((m) => m.AccessibilityPage),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./privacy-page/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'terms',
    loadComponent: () => import('./terms-page/terms-page').then((m) => m.TermsPage),
  },
  { path: '', component: App, pathMatch: 'full' },
];
