import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { WEATHER_ALERT_POLICY_COPY } from '../app';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-terms-page',
  imports: [CardModule],
  templateUrl: './terms-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPage {
  private readonly siteLanguageService = inject(SiteLanguageService);
  protected readonly copy = computed(() => WEATHER_ALERT_POLICY_COPY[this.siteLanguageService.currentLanguage() || 'en'].terms);
}
