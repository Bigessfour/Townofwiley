import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { WEATHER_ALERT_POLICY_COPY } from '../app';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-privacy-page',
  imports: [CardModule],
  templateUrl: './privacy-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  private readonly siteLanguageService = inject(SiteLanguageService);
  protected readonly copy = computed(() => WEATHER_ALERT_POLICY_COPY[this.siteLanguageService.currentLanguage() || 'en'].privacy);
}
