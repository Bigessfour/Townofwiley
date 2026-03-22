import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

const WILEY_POINT_URL = 'https://api.weather.gov/points/38.154,-102.72';
const WILEY_FORECAST_PAGE_URL =
  'https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248';
const NWS_FORECAST_MAPS_URL = 'https://www.weather.gov/forecastmaps';

interface RuntimeWeatherConfig {
  apiEndpoint: string;
  allowBrowserFallback: boolean;
}

interface NwsPointResponse {
  properties: {
    forecast: string;
    forecastZone: string;
    relativeLocation?: {
      properties?: {
        city?: string;
        state?: string;
      };
    };
  };
}

interface NwsForecastResponse {
  properties: {
    updatedAt?: string;
    periods: NwsForecastPeriod[];
  };
}

interface NwsForecastPeriod {
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  probabilityOfPrecipitation?: {
    value: number | null;
  };
  windSpeed: string;
  windDirection: string;
  icon?: string | null;
  shortForecast: string;
  detailedForecast: string;
}

interface NwsAlertResponse {
  features: Array<{
    properties: NwsAlertProperties;
  }>;
}

interface NwsAlertProperties {
  event: string;
  headline?: string;
  severity?: string;
  urgency?: string;
  description?: string;
  instruction?: string;
  expires?: string;
}

interface WeatherProxyResponse {
  locationLabel?: string;
  updatedAt?: string;
  periods?: NwsForecastPeriod[];
  alerts?: NwsAlertProperties[];
}

interface WeatherPeriod {
  name: string;
  shortForecast: string;
  detailedForecast: string;
  temperatureLabel: string;
  windLabel: string;
  precipitationLabel: string;
  iconUrl?: string;
  iconAlt: string;
  isDaytime: boolean;
}

interface WeatherAlert {
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  instruction?: string;
  expiresLabel?: string;
}

@Component({
  selector: 'app-weather-panel',
  imports: [],
  templateUrl: './weather-panel.html',
  styleUrl: './weather-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherPanel {
  private readonly http = inject(HttpClient);
  private readonly weatherConfig = this.getWeatherRuntimeConfig();
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  protected readonly weatherGovUrl = WILEY_FORECAST_PAGE_URL;
  protected readonly forecastMapsUrl = NWS_FORECAST_MAPS_URL;
  protected readonly weatherSourceLabel = computed(() => {
    return this.weatherConfig.apiEndpoint
      ? 'Source: weather.gov via Town of Wiley AWS weather service'
      : 'Source: weather.gov';
  });
  protected readonly locationLabel = signal('Wiley, CO');
  protected readonly updatedLabel = signal('');
  protected readonly isLoading = signal(true);
  protected readonly isRefreshing = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly weatherPeriods = signal<WeatherPeriod[]>([]);
  protected readonly weatherAlerts = signal<WeatherAlert[]>([]);

  protected readonly currentPeriod = computed(() => this.weatherPeriods()[0] ?? null);
  protected readonly upcomingPeriods = computed(() => this.weatherPeriods().slice(1, 5));
  protected readonly hasAlerts = computed(() => this.weatherAlerts().length > 0);
  protected readonly alertSummary = computed(() => {
    const total = this.weatherAlerts().length;

    return total === 1 ? '1 active alert' : `${total} active alerts`;
  });
  protected readonly isBusy = computed(() => this.isLoading() || this.isRefreshing());

  constructor() {
    void this.loadWeather();
  }

  protected async refreshWeather(): Promise<void> {
    await this.loadWeather(true);
  }

  private async loadWeather(isRefresh = false): Promise<void> {
    if (isRefresh) {
      this.isRefreshing.set(true);
    } else {
      this.isLoading.set(true);
    }

    this.loadError.set(null);

    try {
      if (this.weatherConfig.apiEndpoint) {
        await this.loadWeatherFromProxy();
        return;
      }

      await this.loadWeatherFromBrowser();
    } catch {
      if (this.weatherConfig.apiEndpoint && this.weatherConfig.allowBrowserFallback) {
        try {
          await this.loadWeatherFromBrowser();
          this.loadError.set(
            'Town weather service is temporarily unavailable, so the site fell back to the public National Weather Service feed.',
          );
          return;
        } catch {
          this.loadError.set(
            'The National Weather Service forecast is temporarily unavailable. Please open the full forecast page for the latest official conditions.',
          );
        }
      } else {
        this.loadError.set(
          isRefresh
            ? 'Unable to refresh the National Weather Service forecast right now. Showing the last available weather snapshot when possible.'
            : 'The National Weather Service forecast is temporarily unavailable. Please open the full forecast page for the latest official conditions.',
        );
      }
    } finally {
      this.isLoading.set(false);
      this.isRefreshing.set(false);
    }
  }

  private async loadWeatherFromProxy(): Promise<void> {
    const response = await firstValueFrom(
      this.http.get<WeatherProxyResponse>(this.weatherConfig.apiEndpoint),
    );

    if (!response.periods?.length) {
      throw new Error('Weather proxy did not return any forecast periods.');
    }

    if (response.locationLabel?.trim()) {
      this.locationLabel.set(response.locationLabel.trim());
    }

    this.weatherPeriods.set(response.periods.map((period) => this.mapPeriod(period)));
    this.weatherAlerts.set((response.alerts ?? []).map((alert) => this.mapAlert(alert)));
    this.updatedLabel.set(
      response.updatedAt ? this.dateTimeFormatter.format(new Date(response.updatedAt)) : '',
    );
  }

  private async loadWeatherFromBrowser(): Promise<void> {
    const pointResponse = await firstValueFrom(this.http.get<NwsPointResponse>(WILEY_POINT_URL));
    const zoneCode = this.extractZoneCode(pointResponse.properties.forecastZone);
    const relativeLocation = pointResponse.properties.relativeLocation?.properties;

    if (relativeLocation?.city && relativeLocation.state) {
      this.locationLabel.set(`${relativeLocation.city}, ${relativeLocation.state}`);
    }

    const [forecastResponse, alertResponse] = await Promise.all([
      firstValueFrom(this.http.get<NwsForecastResponse>(pointResponse.properties.forecast)),
      firstValueFrom(
        this.http.get<NwsAlertResponse>(`https://api.weather.gov/alerts/active?zone=${zoneCode}`),
      ),
    ]);

    this.weatherPeriods.set(
      forecastResponse.properties.periods.map((period) => this.mapPeriod(period)),
    );
    this.weatherAlerts.set(
      alertResponse.features.map((feature) => this.mapAlert(feature.properties)),
    );
    this.updatedLabel.set(
      forecastResponse.properties.updatedAt
        ? this.dateTimeFormatter.format(new Date(forecastResponse.properties.updatedAt))
        : '',
    );
  }

  private extractZoneCode(zoneUrl: string): string {
    const zoneCode = zoneUrl.split('/').pop()?.trim();

    if (!zoneCode) {
      throw new Error('Missing forecast zone code.');
    }

    return zoneCode;
  }

  private mapPeriod(period: NwsForecastPeriod): WeatherPeriod {
    const precipitationValue = period.probabilityOfPrecipitation?.value;

    return {
      name: period.name,
      shortForecast: period.shortForecast,
      detailedForecast: this.normalizeWhitespace(period.detailedForecast),
      temperatureLabel: `${period.temperature}\u00B0${period.temperatureUnit}`,
      windLabel: `${period.windDirection} ${period.windSpeed}`,
      precipitationLabel:
        typeof precipitationValue === 'number'
          ? `${precipitationValue}% chance of precipitation`
          : 'Precipitation chance not listed',
      iconUrl: period.icon?.replace('size=medium', 'size=large') ?? undefined,
      iconAlt: `${period.name}: ${period.shortForecast}`,
      isDaytime: period.isDaytime,
    };
  }

  private mapAlert(alert: NwsAlertProperties): WeatherAlert {
    const fallbackHeadline = alert.description?.split('\n').find((line) => line.trim().length);

    return {
      event: alert.event,
      headline: this.normalizeWhitespace(alert.headline ?? fallbackHeadline ?? alert.event),
      severity: alert.severity ?? 'Unknown severity',
      urgency: alert.urgency ?? 'Unknown urgency',
      instruction: alert.instruction ? this.normalizeWhitespace(alert.instruction) : undefined,
      expiresLabel: alert.expires
        ? `Expires ${this.dateTimeFormatter.format(new Date(alert.expires))}`
        : undefined,
    };
  }

  private normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private getWeatherRuntimeConfig(): RuntimeWeatherConfig {
    const runtimeWindow =
      typeof window === 'undefined'
        ? undefined
        : (window as Window & {
            __TOW_RUNTIME_CONFIG__?: {
              weather?: {
                apiEndpoint?: string;
                allowBrowserFallback?: boolean;
              };
            };
            __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
              weather?: {
                apiEndpoint?: string;
                allowBrowserFallback?: boolean;
              };
            };
          });
    const weatherConfig = {
      ...(runtimeWindow?.__TOW_RUNTIME_CONFIG__?.weather ?? {}),
      ...(runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__?.weather ?? {}),
    };

    return {
      apiEndpoint: typeof weatherConfig.apiEndpoint === 'string' ? weatherConfig.apiEndpoint : '',
      allowBrowserFallback: weatherConfig.allowBrowserFallback !== false,
    };
  }
}
