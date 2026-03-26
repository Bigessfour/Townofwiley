import { Routes } from '@angular/router';
import { AccessibilitySupport } from './accessibility-support/accessibility-support';
import { App } from './app';
import { BusinessDirectory } from './business-directory/business-directory';
import { ClerkSetup } from './clerk-setup/clerk-setup';
import { CmsAdmin } from './cms-admin/cms-admin';
import { DocumentHub } from './document-hub/document-hub';
import { RecordsCenter } from './records-center/records-center';
import { ResidentServices } from './resident-services/resident-services';
import { LocalizedWeatherPanel } from './weather-panel/localized-weather-panel';

export const routes: Routes = [
  { path: 'admin', component: CmsAdmin },
  { path: 'clerk-setup', component: ClerkSetup },
  { path: 'documents', component: DocumentHub },
  { path: 'notices', component: App },
  { path: 'meetings', component: App },
  { path: 'weather', component: LocalizedWeatherPanel },
  { path: 'services', component: ResidentServices },
  { path: 'records', component: RecordsCenter },
  { path: 'businesses', component: BusinessDirectory },
  { path: 'contact', component: App },
  { path: 'accessibility', component: AccessibilitySupport },
  { path: '', component: App, pathMatch: 'full' },
];
