import { Routes } from '@angular/router';
import { App } from './app';

export const routes: Routes = [
  { path: 'admin', component: App },
  { path: 'clerk-setup', component: App },
  { path: 'documents', component: App },
  { path: 'notices', component: App },
  { path: 'meetings', component: App },
  { path: 'weather', component: App },
  { path: 'services', component: App },
  { path: 'records', component: App },
  { path: 'businesses', component: App },
  { path: 'news', component: App },
  { path: 'contact', component: App },
  { path: 'accessibility', component: App },
  { path: '', component: App, pathMatch: 'full' },
];
