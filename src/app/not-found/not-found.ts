import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';

import type { SiteLanguage } from '../site-language';
import { SiteLanguageService } from '../site-language';

const NOT_FOUND_COPY: Record<
  SiteLanguage,
  { heading: string; body: string; homeCta: string; servicesCta: string }
> = {
  en: {
    heading: 'Page not found',
    body: 'The page you are looking for does not exist or may have moved. Try the homepage or resident services.',
    homeCta: 'Return to homepage',
    servicesCta: 'Browse resident services',
  },
  es: {
    heading: 'Página no encontrada',
    body: 'La página que busca no existe o se ha movido. Pruebe la página principal o los servicios para residentes.',
    homeCta: 'Volver a la página principal',
    servicesCta: 'Ver servicios para residentes',
  },
};

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, CardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="not-found panel mx-auto grid max-w-2xl gap-6 px-4 py-10"
      aria-labelledby="not-found-heading"
      data-testid="not-found-page"
    >
      <p-card>
        <ng-template pTemplate="header">
          <h1 id="not-found-heading" class="text-2xl font-semibold">{{ copy().heading }}</h1>
        </ng-template>
        <ng-template pTemplate="content">
          <p class="m-0 text-balance">{{ copy().body }}</p>
        </ng-template>
        <ng-template pTemplate="footer">
          <div class="flex flex-wrap gap-4">
            <a routerLink="/" class="button-cta button-cta--solid">{{ copy().homeCta }}</a>
            <a routerLink="/services" class="button-cta button-cta--ghost">{{ copy().servicesCta }}</a>
          </div>
        </ng-template>
      </p-card>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class NotFoundComponent {
  private readonly siteLanguage = inject(SiteLanguageService).currentLanguage;
  protected readonly copy = computed(() => NOT_FOUND_COPY[this.siteLanguage()]);
}
