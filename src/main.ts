import './browser-global-polyfill';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import './app/amplify-config';

function sanitizeBootstrapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message.replace(/[\r\n]+/g, ' ').trim();
}

bootstrapApplication(App, appConfig).catch((error) =>
  console.error('Bootstrap failed', sanitizeBootstrapError(error)),
);
