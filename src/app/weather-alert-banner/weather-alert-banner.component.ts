import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import type { HomepageWeatherAlert } from '../weather-panel/localized-weather-panel';

@Component({
  selector: 'app-weather-alert-banner',
  imports: [ButtonModule, CardModule],
  templateUrl: './weather-alert-banner.component.html',
  styleUrl: './weather-alert-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherAlertBannerComponent {
  private readonly platformId = inject(PLATFORM_ID);

  readonly alert = input.required<HomepageWeatherAlert>();
  readonly kickerLabel = input.required<string>();
  readonly forecastLabel = input.required<string>();
  readonly signupLabel = input.required<string>();
  readonly dismissLabel = input.required<string>();

  readonly dismissed = output<void>();
  readonly signupClick = output<void>();

  readonly cardPt = {
    body: { class: 'weather-alert-banner__p-body' },
    content: { class: 'weather-alert-banner__p-content' },
  };

  readonly bannerIcon = computed(() => {
    const ev = this.alert().event.toLowerCase();
    if (
      ev.includes('frost') ||
      ev.includes('freeze') ||
      ev.includes('snow') ||
      ev.includes('winter') ||
      ev.includes('ice')
    ) {
      return 'pi pi-snowflake';
    }
    if (
      ev.includes('warning') ||
      ev.includes('emergency') ||
      this.alert().severity?.toLowerCase() === 'extreme'
    ) {
      return 'pi pi-exclamation-triangle';
    }
    return 'pi pi-thermometer-half';
  });

  onDismiss(): void {
    this.dismissed.emit();
  }

  onSignup(): void {
    this.signupClick.emit();
  }

  openForecast(): void {
    const url = this.alert().forecastUrl?.trim();
    if (!url || !isPlatformBrowser(this.platformId)) {
      return;
    }
    globalThis.open?.(url, '_blank', 'noopener,noreferrer');
  }
}
