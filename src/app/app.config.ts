import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  provideAnimations,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideAnimations(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: { prefix: 'p' },
      },
    }),
  ],
};
