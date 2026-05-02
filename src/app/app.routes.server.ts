import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'weather', renderMode: RenderMode.Prerender },
  { path: 'notices', renderMode: RenderMode.Prerender },
  { path: 'meetings', renderMode: RenderMode.Prerender },
  { path: 'services', renderMode: RenderMode.Prerender },
  { path: 'records', renderMode: RenderMode.Prerender },
  { path: 'businesses', renderMode: RenderMode.Prerender },
  { path: 'pay-bill', renderMode: RenderMode.Prerender },
  { path: 'permits', renderMode: RenderMode.Prerender },
  { path: 'news', renderMode: RenderMode.Prerender },
  { path: 'contact', renderMode: RenderMode.Prerender },
  { path: 'accessibility', renderMode: RenderMode.Prerender },
  { path: 'privacy', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'documents', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
