import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { HomepageWeatherAlert } from './weather-panel';

const WILEY_POINT_URL = 'https://api.weather.gov/points/38.154,-102.72';
const WILEY_FORECAST_PAGE_URL = 'https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248';

interface NwsPointResponse {
  properties: {
    forecastZone: string;
  };
}

interface NwsAlertResponse {
  features: {
    properties: {
      event: string;
      headline?: string;
      severity?: string;
      urgency?: string;
      description?: string;
      instruction?: string;
    };
  }[];
}

@Component({
  selector: 'app-homepage-weather-alert-primer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomepageWeatherAlertPrimer {
  private readonly http = inject(HttpClient);
  readonly activeAlertChange = output<HomepageWeatherAlert | null>();

  constructor() {
    void this.loadAlert();
  }

  private async loadAlert(): Promise<void> {
    try {
      const pointResponse = await firstValueFrom(this.http.get<NwsPointResponse>(WILEY_POINT_URL));
      const zoneCode = pointResponse.properties.forecastZone.split('/').pop();
      if (!zoneCode) {
        this.activeAlertChange.emit(null);
        return;
      }
      const alertResponse = await firstValueFrom(this.http.get<NwsAlertResponse>(`https://api.weather.gov/alerts/active?zone=${zoneCode}`));
      const primary = alertResponse.features[0]?.properties;
      if (!primary) {
        this.activeAlertChange.emit(null);
        return;
      }
      const total = alertResponse.features.length;
      this.activeAlertChange.emit({
        total,
        event: primary.event,
        headline: (primary.headline ?? primary.description ?? primary.event).replace(/\s+/g, ' ').trim(),
        instruction: primary.instruction ? primary.instruction.replace(/\s+/g, ' ').trim() : undefined,
        severity: primary.severity,
        urgency: primary.urgency,
        forecastUrl: WILEY_FORECAST_PAGE_URL,
      });
    } catch {
      this.activeAlertChange.emit(null);
    }
  }
}
