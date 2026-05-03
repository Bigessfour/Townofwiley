import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  isDevMode,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { HomepageWeatherAlert } from './weather-panel';
import { readWeatherRuntimeConfig } from './weather-runtime-config';

const WILEY_POINT_URL = 'https://api.weather.gov/points/38.154,-102.72';
const WILEY_FORECAST_PAGE_URL =
  'https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248';

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

interface WeatherProxyAlertPayload {
  event: string;
  headline?: string;
  severity?: string;
  urgency?: string;
  instruction?: string;
}

interface WeatherProxyPrimerResponse {
  alerts?: WeatherProxyAlertPayload[];
}

@Component({
  selector: 'app-homepage-weather-alert-primer',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomepageWeatherAlertPrimer {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private isDestroyed = false;
  readonly activeAlertChange = output<HomepageWeatherAlert | null>();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;
    });

    if (isPlatformBrowser(this.platformId)) {
      void this.loadAlert();
    }
  }

  private async loadAlert(): Promise<void> {
    const config = readWeatherRuntimeConfig();
    const proxyUrl = config.apiEndpoint.trim();

    if (proxyUrl) {
      try {
        await this.loadAlertFromProxy(proxyUrl);
        return;
      } catch (firstError) {
        this.logPrimerFailure('weather-proxy', firstError);
        if (!config.allowBrowserFallback) {
          this.safeEmitAlert(null);
          return;
        }
      }
    }

    try {
      await this.loadAlertFromNwsBrowser();
    } catch (secondError) {
      this.logPrimerFailure('nws-direct', secondError);
      this.safeEmitAlert(null);
    }
  }

  private logPrimerFailure(source: 'weather-proxy' | 'nws-direct', error: unknown): void {
    if (!isDevMode()) {
      return;
    }
    const message =
      error instanceof Error && error.message.trim() ? error.message.trim() : String(error);
    console.warn(`[HomepageWeatherAlertPrimer] ${source} failed:`, message);
  }

  private async loadAlertFromProxy(apiEndpoint: string): Promise<void> {
    const response = await firstValueFrom(this.http.get<WeatherProxyPrimerResponse>(apiEndpoint));
    const alerts = response.alerts ?? [];

    if (!alerts.length) {
      this.safeEmitAlert(null);
      return;
    }

    const primary = alerts[0];
    this.safeEmitAlert({
      total: alerts.length,
      event: primary.event,
      headline: (primary.headline ?? primary.event).replace(/\s+/g, ' ').trim(),
      instruction: primary.instruction
        ? primary.instruction.replace(/\s+/g, ' ').trim()
        : undefined,
      severity: primary.severity,
      urgency: primary.urgency,
      forecastUrl: WILEY_FORECAST_PAGE_URL,
    });
  }

  private async loadAlertFromNwsBrowser(): Promise<void> {
    const pointResponse = await firstValueFrom(this.http.get<NwsPointResponse>(WILEY_POINT_URL));
    const zoneCode = pointResponse.properties.forecastZone.split('/').pop();

    if (!zoneCode) {
      this.safeEmitAlert(null);
      return;
    }

    const alertResponse = await firstValueFrom(
      this.http.get<NwsAlertResponse>(`https://api.weather.gov/alerts/active?zone=${zoneCode}`),
    );
    const primary = alertResponse.features[0]?.properties;

    if (!primary) {
      this.safeEmitAlert(null);
      return;
    }

    const total = alertResponse.features.length;
    this.safeEmitAlert({
      total,
      event: primary.event,
      headline: (primary.headline ?? primary.description ?? primary.event)
        .replace(/\s+/g, ' ')
        .trim(),
      instruction: primary.instruction
        ? primary.instruction.replace(/\s+/g, ' ').trim()
        : undefined,
      severity: primary.severity,
      urgency: primary.urgency,
      forecastUrl: WILEY_FORECAST_PAGE_URL,
    });
  }

  private safeEmitAlert(alert: HomepageWeatherAlert | null): void {
    if (this.isDestroyed) {
      return;
    }

    this.activeAlertChange.emit(alert);
  }
}
