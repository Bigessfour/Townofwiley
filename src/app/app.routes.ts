import { Routes } from '@angular/router';
import { AccessibilitySupport } from './accessibility-support/accessibility-support';
import { ClerkSetup } from './clerk-setup/clerk-setup';
import { CmsAdmin } from './cms-admin/cms-admin';
import { DocumentHub } from './document-hub/document-hub';
import { RecordsCenter } from './records-center/records-center';
import { ResidentServices } from './resident-services/resident-services';
import { LocalizedWeatherPanel } from './weather-panel/localized-weather-panel';
import { App } from './app';

export const routes: Routes = [
  { path: '', component: App },
  { path: 'admin', component: CmsAdmin },
  { path: 'clerk-setup', component: ClerkSetup },
  { path: 'documents', component: DocumentHub },
  { path: 'weather', component: LocalizedWeatherPanel },
  { path: 'services', component: ResidentServices },
  { path: 'records', component: RecordsCenter },
  { path: 'accessibility', component: AccessibilitySupport },
];
