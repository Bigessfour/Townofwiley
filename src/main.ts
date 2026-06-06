import { bootstrapApplication } from '@angular/platform-browser';
import 'aws-amplify/auth/enable-oauth-listener';
import './app/amplify-config';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import './browser-global-polyfill';

function sanitizeBootstrapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message.replace(/[\r\n]+/g, ' ').trim();
}

bootstrapApplication(App, appConfig).catch((error) =>
  console.error('Bootstrap failed', sanitizeBootstrapError(error)),
);
