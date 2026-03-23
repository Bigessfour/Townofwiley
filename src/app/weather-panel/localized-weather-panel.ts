import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SiteLanguage, SiteLanguageService } from '../site-language';

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

interface AlertSignupErrorDetails {
  message: string;
  emailTemporarilyUnavailable: boolean;
}

interface WeatherCopy {
  sectionKicker: string;
  headingPrefix: string;
  intro: string;
  sourceDirect: string;
  sourceProxy: string;
  updatedPrefix: string;
  refresh: string;
  refreshing: string;
  openForecast: string;
  loading: string;
  fallbackError: string;
  unavailableError: string;
  refreshError: string;
  windLabel: string;
  precipitationLabel: string;
  precipitationChanceSuffix: string;
  precipitationUnknown: string;
  alertsKicker: string;
  alertsHeading: string;
  oneActiveAlert: string;
  manyActiveAlertsSuffix: string;
  noActiveAlerts: string;
  noAlertsTitle: string;
  noAlertsBody: string;
  unknownSeverity: string;
  unknownUrgency: string;
  expiresPrefix: string;
  residentAlertsKicker: string;
  residentAlertsHeading: string;
  residentAlertsBody: string;
  notificationMethod: string;
  email: string;
  sms: string;
  destinationEmailLabel: string;
  destinationSmsLabel: string;
  destinationEmailPlaceholder: string;
  destinationSmsPlaceholder: string;
  alertLanguage: string;
  optionEnglish: string;
  optionSpanish: string;
  fullName: string;
  fullNamePlaceholder: string;
  zipCode: string;
  confirmationNote: string;
  submit: string;
  submitting: string;
  invalidEmail: string;
  invalidSms: string;
  signupSuccess: string;
  signupError: string;
  forecastMaps: string;
}

const WEATHER_COPY: Record<SiteLanguage, WeatherCopy> = {
  en: {
    sectionKicker: 'Local Weather',
    headingPrefix: 'National Weather Service forecast for',
    intro:
      'Official weather and alert data from the National Weather Service, surfaced here so residents can quickly spot wind, temperature swings, and any active advisories that may affect town services.',
    sourceDirect: 'Source: weather.gov',
    sourceProxy: 'Source: weather.gov via Town of Wiley AWS weather service',
    updatedPrefix: 'Forecast updated',
    refresh: 'Refresh forecast',
    refreshing: 'Refreshing...',
    openForecast: 'Open full forecast',
    loading: 'Loading official forecast and alerts...',
    fallbackError:
      'Town weather service is temporarily unavailable, so the site fell back to the public National Weather Service feed.',
    unavailableError:
      'The National Weather Service forecast is temporarily unavailable. Please open the full forecast page for the latest official conditions.',
    refreshError:
      'Unable to refresh the National Weather Service forecast right now. Showing the last available weather snapshot when possible.',
    windLabel: 'Wind',
    precipitationLabel: 'Precipitation',
    precipitationChanceSuffix: '% chance of precipitation',
    precipitationUnknown: 'Precipitation chance not listed',
    alertsKicker: 'Alerts',
    alertsHeading: 'Active watches, warnings, and advisories',
    oneActiveAlert: '1 active alert',
    manyActiveAlertsSuffix: 'active alerts',
    noActiveAlerts: 'No active alerts',
    noAlertsTitle: 'No active NWS alerts for the Wiley forecast zone.',
    noAlertsBody:
      'Normal conditions do not guarantee there will be no service interruptions. Residents should still monitor town notices for utility, road, or closure updates.',
    unknownSeverity: 'Unknown severity',
    unknownUrgency: 'Unknown urgency',
    expiresPrefix: 'Expires',
    residentAlertsKicker: 'Resident alerts',
    residentAlertsHeading: 'Sign up for severe weather alerts',
    residentAlertsBody:
      'Residents in ZIP code 81092 can request confirmation-based SMS or email weather alerts for the Wiley service area. SMS is the fastest signup path while email confirmations finish AWS approval.',
    notificationMethod: 'Notification method',
    email: 'Email',
    sms: 'SMS text',
    destinationEmailLabel: 'Email address',
    destinationSmsLabel: 'Mobile number',
    destinationEmailPlaceholder: 'resident@example.com',
    destinationSmsPlaceholder: '(719) 555-0102',
    alertLanguage: 'Alert language',
    optionEnglish: 'English',
    optionSpanish: 'Spanish',
    fullName: 'Full name (optional)',
    fullNamePlaceholder: 'Jordan Resident',
    zipCode: 'Service ZIP code',
    confirmationNote:
      'We send a confirmation first. Alerts do not start until the resident finishes the confirmation step.',
    submit: 'Sign up for alerts',
    submitting: 'Sending confirmation...',
    invalidEmail: 'Enter a valid email address before signing up for severe weather alerts.',
    invalidSms: 'Enter a valid mobile number with area code before signing up for text alerts.',
    signupSuccess:
      'Request received. Confirm the {language} alert link that was sent before alerts start flowing.',
    signupError:
      'Unable to start severe weather alerts right now. Please try again or contact Town Hall.',
    forecastMaps: 'Browse national forecast maps',
  },
  es: {
    sectionKicker: 'Clima local',
    headingPrefix: 'Pronostico del Servicio Nacional de Meteorologia para',
    intro:
      'Datos oficiales del clima y alertas del Servicio Nacional de Meteorologia, mostrados aqui para que los residentes detecten rapidamente viento, cambios de temperatura y cualquier aviso activo que pueda afectar los servicios del pueblo.',
    sourceDirect: 'Fuente: weather.gov',
    sourceProxy: 'Fuente: weather.gov mediante el servicio AWS del Pueblo de Wiley',
    updatedPrefix: 'Pronostico actualizado',
    refresh: 'Actualizar pronostico',
    refreshing: 'Actualizando...',
    openForecast: 'Abrir pronostico completo',
    loading: 'Cargando el pronostico oficial y las alertas...',
    fallbackError:
      'El servicio meteorologico del pueblo no esta disponible temporalmente, por lo que el sitio volvio al canal publico del Servicio Nacional de Meteorologia.',
    unavailableError:
      'El pronostico del Servicio Nacional de Meteorologia no esta disponible temporalmente. Abra la pagina completa del pronostico para ver las condiciones oficiales mas recientes.',
    refreshError:
      'No se pudo actualizar el pronostico del Servicio Nacional de Meteorologia en este momento. Se muestra la ultima captura disponible cuando es posible.',
    windLabel: 'Viento',
    precipitationLabel: 'Precipitacion',
    precipitationChanceSuffix: '% de probabilidad de precipitacion',
    precipitationUnknown: 'No se indico la probabilidad de precipitacion',
    alertsKicker: 'Alertas',
    alertsHeading: 'Vigilancias, advertencias y avisos activos',
    oneActiveAlert: '1 alerta activa',
    manyActiveAlertsSuffix: 'alertas activas',
    noActiveAlerts: 'Sin alertas activas',
    noAlertsTitle: 'No hay alertas activas del NWS para la zona de pronostico de Wiley.',
    noAlertsBody:
      'Las condiciones normales no garantizan que no haya interrupciones de servicio. Los residentes deben seguir revisando los avisos del pueblo para ver actualizaciones sobre servicios, caminos o cierres.',
    unknownSeverity: 'Severidad no indicada',
    unknownUrgency: 'Urgencia no indicada',
    expiresPrefix: 'Vence',
    residentAlertsKicker: 'Alertas para residentes',
    residentAlertsHeading: 'Suscribirse a alertas de clima severo',
    residentAlertsBody:
      'Los residentes del codigo postal 81092 pueden solicitar alertas del clima para el area de servicio de Wiley por SMS o correo electronico con confirmacion previa. El SMS es la ruta mas rapida mientras AWS termina la aprobacion del correo.',
    notificationMethod: 'Metodo de notificacion',
    email: 'Correo electronico',
    sms: 'Mensaje SMS',
    destinationEmailLabel: 'Correo electronico',
    destinationSmsLabel: 'Numero celular',
    destinationEmailPlaceholder: 'residente@ejemplo.com',
    destinationSmsPlaceholder: '(719) 555-0102',
    alertLanguage: 'Idioma de la alerta',
    optionEnglish: 'English',
    optionSpanish: 'Espanol',
    fullName: 'Nombre completo (opcional)',
    fullNamePlaceholder: 'Jordan Resident',
    zipCode: 'Codigo postal del servicio',
    confirmationNote:
      'Primero enviamos una confirmacion. Las alertas no comienzan hasta que la persona complete ese paso.',
    submit: 'Suscribirse a alertas',
    submitting: 'Enviando confirmacion...',
    invalidEmail:
      'Ingrese un correo electronico valido antes de suscribirse a alertas de clima severo.',
    invalidSms:
      'Ingrese un numero celular valido con codigo de area antes de suscribirse a alertas por texto.',
    signupSuccess:
      'Solicitud recibida. Confirme el enlace de alertas en {language} que se envio antes de que empiecen a llegar las alertas.',
    signupError:
      'No fue posible iniciar las alertas de clima severo en este momento. Intente de nuevo o contacte al ayuntamiento.',
    forecastMaps: 'Explorar mapas nacionales del pronostico',
  },
};

@Component({
  selector: 'app-weather-panel',
  imports: [],
  templateUrl: './localized-weather-panel.html',
  styleUrl: './weather-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocalizedWeatherPanel {
  private readonly http = inject(HttpClient);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly weatherConfig = this.getWeatherRuntimeConfig();
  private readonly englishDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  private readonly spanishDateTimeFormatter = new Intl.DateTimeFormat('es-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  protected readonly weatherGovUrl = WILEY_FORECAST_PAGE_URL;
  protected readonly forecastMapsUrl = NWS_FORECAST_MAPS_URL;
  protected readonly copy = computed(
    () => WEATHER_COPY[this.siteLanguageService.currentLanguage()],
  );
  protected readonly weatherSourceLabel = computed(() => {
    return this.weatherConfig.apiEndpoint ? this.copy().sourceProxy : this.copy().sourceDirect;
  });
  protected readonly locationLabel = signal('Wiley, CO');
  protected readonly updatedAtState = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isRefreshing = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly forecastPeriodsState = signal<NwsForecastPeriod[]>([]);
  protected readonly alertRecordsState = signal<NwsAlertProperties[]>([]);
  protected readonly alertSignupChannel = signal<AlertSignupChannel>('sms');
  protected readonly alertSignupLanguage = signal<AlertLanguage>(DEFAULT_ALERT_LANGUAGE);
  protected readonly alertSignupDestination = signal('');
  protected readonly alertSignupFullName = signal('');
  protected readonly alertSignupFeedback = signal<string | null>(null);
  protected readonly alertSignupFeedbackTone = signal<AlertSignupFeedbackTone>('success');
  protected readonly isAlertSignupSubmitting = signal(false);

  protected readonly updatedLabel = computed(() => {
    const updatedAt = this.updatedAtState();

    return updatedAt ? this.formatDateTime(updatedAt) : '';
  });
  protected readonly weatherPeriods = computed(() =>
    this.forecastPeriodsState().map((period) => this.mapPeriod(period)),
  );
  protected readonly weatherAlerts = computed(() =>
    this.alertRecordsState().map((alert) => this.mapAlert(alert)),
  );
  protected readonly currentPeriod = computed(() => this.weatherPeriods()[0] ?? null);
  protected readonly upcomingPeriods = computed(() => this.weatherPeriods().slice(1, 5));
  protected readonly hasAlerts = computed(() => this.weatherAlerts().length > 0);
  protected readonly alertSummary = computed(() => {
    const total = this.weatherAlerts().length;

    return total === 1
      ? this.copy().oneActiveAlert
      : `${total} ${this.copy().manyActiveAlertsSuffix}`;
  });
  protected readonly isBusy = computed(() => this.isLoading() || this.isRefreshing());
  protected readonly isAlertSignupEnabled = computed(() => {
    return (
      this.weatherConfig.alertSignup.enabled && Boolean(this.weatherConfig.alertSignup.apiEndpoint)
    );
  });
  protected readonly alertSignupDestinationLabel = computed(() => {
    return this.alertSignupChannel() === 'sms'
      ? this.copy().destinationSmsLabel
      : this.copy().destinationEmailLabel;
  });
  protected readonly alertSignupDestinationPlaceholder = computed(() => {
    return this.alertSignupChannel() === 'sms'
      ? this.copy().destinationSmsPlaceholder
      : this.copy().destinationEmailPlaceholder;
  });
  protected readonly alertSignupDestinationType = computed(() => {
    return this.alertSignupChannel() === 'sms' ? 'tel' : 'email';
  });
  protected readonly alertSignupLanguageLabel = computed(() => {
    return this.alertSignupLanguage() === 'es'
      ? this.copy().optionSpanish
      : this.copy().optionEnglish;
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
    return this.isAlertSignupSubmitting() ? this.copy().submitting : this.copy().submit;
  });

  constructor() {
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

    const destination = this.alertSignupDestination().trim();
    const fullName = this.alertSignupFullName().trim();

    if (!this.isAlertSignupEnabled() || this.isAlertSignupSubmitting() || !destination) {
      return;
    }

    if (!this.isAlertSignupDestinationValid()) {
      this.alertSignupFeedbackTone.set('error');
      this.alertSignupFeedback.set(
        this.alertSignupChannel() === 'sms' ? this.copy().invalidSms : this.copy().invalidEmail,
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
            this.copy().signupSuccess.replace(
              '{language}',
              this.alertSignupLanguageLabel().toLowerCase(),
            ),
        ),
      );
      this.alertSignupDestination.set('');
      this.alertSignupFullName.set('');
    } catch (error) {
      const signupError = this.readAlertSignupError(error);

      if (signupError.emailTemporarilyUnavailable && this.alertSignupChannel() === 'email') {
        this.alertSignupChannel.set('sms');
        this.alertSignupDestination.set('');
      }

      this.alertSignupFeedbackTone.set('error');
      this.alertSignupFeedback.set(signupError.message);
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
          this.loadError.set(this.copy().fallbackError);
          return;
        } catch {
          this.loadError.set(this.copy().unavailableError);
        }
      } else {
        this.loadError.set(isRefresh ? this.copy().refreshError : this.copy().unavailableError);
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

    this.forecastPeriodsState.set(response.periods);
    this.alertRecordsState.set(response.alerts ?? []);
    this.updatedAtState.set(response.updatedAt ?? null);
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

    this.forecastPeriodsState.set(forecastResponse.properties.periods);
    this.alertRecordsState.set(alertResponse.features.map((feature) => feature.properties));
    this.updatedAtState.set(forecastResponse.properties.updatedAt ?? null);
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
          ? `${precipitationValue}${this.copy().precipitationChanceSuffix}`
          : this.copy().precipitationUnknown,
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
      severity: alert.severity ?? this.copy().unknownSeverity,
      urgency: alert.urgency ?? this.copy().unknownUrgency,
      instruction: alert.instruction ? this.normalizeWhitespace(alert.instruction) : undefined,
      expiresLabel: alert.expires
        ? `${this.copy().expiresPrefix} ${this.formatDateTime(alert.expires)}`
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

  private readAlertSignupError(error: unknown): AlertSignupErrorDetails {
    if (error instanceof HttpErrorResponse) {
      if (this.isRecord(error.error)) {
        const apiError = error.error['error'];

        if (typeof apiError === 'string' && apiError.trim()) {
          return this.describeAlertSignupError(apiError);
        }

        const apiMessage = error.error['message'];

        if (typeof apiMessage === 'string' && apiMessage.trim()) {
          return this.describeAlertSignupError(apiMessage);
        }
      }

      if (typeof error.error === 'string' && error.error.trim()) {
        return this.describeAlertSignupError(error.error);
      }
    }

    return {
      message: this.copy().signupError,
      emailTemporarilyUnavailable: false,
    };
  }

  private describeAlertSignupError(message: string): AlertSignupErrorDetails {
    const normalizedMessage = this.normalizeWhitespace(message);

    return {
      message: normalizedMessage,
      emailTemporarilyUnavailable: /email confirmations are temporarily unavailable/i.test(
        normalizedMessage,
      ),
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private formatDateTime(value: string): string {
    return (
      this.siteLanguageService.currentLanguage() === 'es'
        ? this.spanishDateTimeFormatter
        : this.englishDateTimeFormatter
    ).format(new Date(value));
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
