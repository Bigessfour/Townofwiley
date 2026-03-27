import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
import { SiteLanguageService } from '../site-language';

const WILEY_POINT_URL = 'https://api.weather.gov/points/38.154,-102.72';
const WILEY_FORECAST_PAGE_URL =
  'https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248';
const NWS_FORECAST_MAPS_URL = 'https://www.weather.gov/forecastmaps';
const ALLOWED_ALERT_SIGNUP_ZIP_CODE = '81092';
const EMAIL_DESTINATION_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SMS_DESTINATION_PATTERN = /^1?\d{10}$/;
const DEFAULT_ALERT_LANGUAGE = 'en';

type AlertLanguage = 'en' | 'es';
type AlertSignupChannel = 'email' | 'sms';
type AlertSignupFeedbackTone = 'success' | 'error';

interface SelectOption<TValue extends string> {
  label: string;
  value: TValue;
}

interface RuntimeAlertSignupConfig {
  enabled: boolean;
  apiEndpoint: string;
}

interface RuntimeWeatherConfig {
  apiEndpoint: string;
  allowBrowserFallback: boolean;
  alertSignup: RuntimeAlertSignupConfig;
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
  features: {
    properties: NwsAlertProperties;
  }[];
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

interface AlertSignupResponse {
  message?: string;
  unsubscribeUrl?: string;
  error?: string;
}

@Component({
  selector: 'app-weather-panel',
  imports: [FormsModule, ButtonModule, InputTextModule, MessageModule, SelectModule],
  templateUrl: './weather-panel.html',
  styleUrl: './weather-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherPanel {
  private readonly http = inject(HttpClient);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly weatherConfig = this.getWeatherRuntimeConfig();
  private readonly dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  protected readonly weatherGovUrl = WILEY_FORECAST_PAGE_URL;
  protected readonly forecastMapsUrl = NWS_FORECAST_MAPS_URL;
  protected readonly alertSignupChannelOptions: SelectOption<AlertSignupChannel>[] = [
    { label: 'Email', value: 'email' },
    { label: 'SMS text', value: 'sms' },
  ];
  protected readonly alertSignupLanguageOptions: SelectOption<AlertLanguage>[] = [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
  ];
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
  protected readonly alertSignupChannel = signal<AlertSignupChannel>('email');
  protected readonly alertSignupLanguage = signal<AlertLanguage>(DEFAULT_ALERT_LANGUAGE);
  protected readonly alertSignupDestination = signal('');
  protected readonly alertSignupFullName = signal('');
  protected readonly alertSignupFeedback = signal<string | null>(null);
  protected readonly alertSignupFeedbackTone = signal<AlertSignupFeedbackTone>('success');
  protected readonly isAlertSignupSubmitting = signal(false);
  protected readonly alertSignupUnsubscribeUrl = signal<string | null>(null);

  protected readonly currentPeriod = computed(() => this.weatherPeriods()[0] ?? null);
  protected readonly upcomingPeriods = computed(() => this.weatherPeriods().slice(1, 5));
  protected readonly hasAlerts = computed(() => this.weatherAlerts().length > 0);
  protected readonly alertSummary = computed(() => {
    const total = this.weatherAlerts().length;

    return total === 1 ? '1 active alert' : `${total} active alerts`;
  });
  protected readonly isBusy = computed(() => this.isLoading() || this.isRefreshing());
  protected readonly isAlertSignupEnabled = computed(() => {
    return (
      this.weatherConfig.alertSignup.enabled && Boolean(this.weatherConfig.alertSignup.apiEndpoint)
    );
  });
  protected readonly alertSignupDestinationLabel = computed(() => {
    return this.alertSignupChannel() === 'sms' ? 'Mobile number' : 'Email address';
  });
  protected readonly alertSignupDestinationPlaceholder = computed(() => {
    return this.alertSignupChannel() === 'sms' ? '(719) 555-0102' : 'resident@example.com';
  });
  protected readonly alertSignupDestinationType = computed(() => {
    return this.alertSignupChannel() === 'sms' ? 'tel' : 'email';
  });
  protected readonly alertSignupLanguageLabel = computed(() => {
    return this.alertSignupLanguage() === 'es' ? 'Spanish' : 'English';
  });
  protected readonly isAlertSignupDestinationValid = computed(() => {
    const destination = this.alertSignupDestination().trim();

    if (!destination) {
      return false;
    }

    if (this.alertSignupChannel() === 'sms') {
      return SMS_DESTINATION_PATTERN.test(destination.replace(/\D/g, ''));
    }

    return EMAIL_DESTINATION_PATTERN.test(destination);
  });
  protected readonly alertSignupSubmitLabel = computed(() => {
    return this.isAlertSignupSubmitting() ? 'Sending confirmation...' : 'Sign up for alerts';
  });

  constructor() {
    effect(() => {
      this.alertSignupLanguage.set(this.siteLanguageService.currentLanguage() as AlertLanguage);
    });
    void this.loadWeather();
  }

  protected updateAlertSignupChannel(value: string): void {
    this.alertSignupChannel.set(value === 'sms' ? 'sms' : 'email');
    this.alertSignupDestination.set('');
    this.alertSignupFeedback.set(null);
  }

  protected updateAlertSignupLanguage(value: string): void {
    this.alertSignupLanguage.set(value === 'es' ? 'es' : DEFAULT_ALERT_LANGUAGE);
    this.alertSignupFeedback.set(null);
  }

  protected updateAlertSignupDestination(value: string): void {
    this.alertSignupDestination.set(value);
    this.alertSignupFeedback.set(null);
  }

  protected updateAlertSignupFullName(value: string): void {
    this.alertSignupFullName.set(value);
    this.alertSignupFeedback.set(null);
  }

  protected async submitAlertSignup(event?: Event): Promise<void> {
    event?.preventDefault();

    this.alertSignupUnsubscribeUrl.set(null);

    const destination = this.alertSignupDestination().trim();
    const fullName = this.alertSignupFullName().trim();

    if (!this.isAlertSignupEnabled() || this.isAlertSignupSubmitting() || !destination) {
      return;
    }

    if (!this.isAlertSignupDestinationValid()) {
      this.alertSignupFeedbackTone.set('error');
      this.alertSignupFeedback.set(
        this.alertSignupChannel() === 'sms'
          ? 'Enter a valid mobile number with area code before signing up for text alerts.'
          : 'Enter a valid email address before signing up for severe weather alerts.',
      );
      return;
    }

    this.isAlertSignupSubmitting.set(true);
    this.alertSignupFeedback.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AlertSignupResponse>(this.buildAlertSignupUrl('/subscriptions'), {
          channel: this.alertSignupChannel(),
          preferredLanguage: this.alertSignupLanguage(),
          destination,
          fullName,
          zipCode: ALLOWED_ALERT_SIGNUP_ZIP_CODE,
        }),
      );

      this.alertSignupFeedbackTone.set('success');
      this.alertSignupFeedback.set(
        this.normalizeWhitespace(
          response.message?.trim() ||
            `Request received. Confirm the ${this.alertSignupLanguageLabel().toLowerCase()} alert link that was sent before alerts start flowing.`,
        ),
      );
      this.alertSignupUnsubscribeUrl.set(response.unsubscribeUrl || null);
      this.alertSignupDestination.set('');
      this.alertSignupFullName.set('');
    } catch (error) {
      this.alertSignupFeedbackTone.set('error');
      this.alertSignupFeedback.set(this.readAlertSignupError(error));
    } finally {
      this.isAlertSignupSubmitting.set(false);
    }
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

  private buildAlertSignupUrl(pathname: string): string {
    const baseUrl = this.weatherConfig.alertSignup.apiEndpoint.trim();
    const resolvedBaseUrl =
      typeof window === 'undefined' ? new URL(baseUrl) : new URL(baseUrl, window.location.origin);

    return new URL(
      pathname.replace(/^\/+/, ''),
      resolvedBaseUrl.toString().endsWith('/')
        ? resolvedBaseUrl.toString()
        : `${resolvedBaseUrl.toString()}/`,
    ).toString();
  }

  private readAlertSignupError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (this.isRecord(error.error)) {
        const apiError = error.error['error'];

        if (typeof apiError === 'string' && apiError.trim()) {
          return this.normalizeWhitespace(apiError.trim());
        }

        const apiMessage = error.error['message'];

        if (typeof apiMessage === 'string' && apiMessage.trim()) {
          return this.normalizeWhitespace(apiMessage.trim());
        }
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return this.normalizeWhitespace(error.error.trim());
      }
    }

    return 'Unable to start severe weather alerts right now. Please try again or contact Town Hall.';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
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
                alertSignup?: {
                  enabled?: boolean;
                  apiEndpoint?: string;
                };
              };
            };
            __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
              weather?: {
                apiEndpoint?: string;
                allowBrowserFallback?: boolean;
                alertSignup?: {
                  enabled?: boolean;
                  apiEndpoint?: string;
                };
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
      alertSignup: {
        enabled: weatherConfig.alertSignup?.enabled !== false,
        apiEndpoint:
          typeof weatherConfig.alertSignup?.apiEndpoint === 'string'
            ? weatherConfig.alertSignup.apiEndpoint
            : '',
      },
    };
  }
}
