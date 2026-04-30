import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteLanguageService } from '../site-language';
import { LocalizedWeatherPanel } from './localized-weather-panel';

type WeatherPanelHarness = InstanceType<typeof LocalizedWeatherPanel> & {
  activeAlertChange: { emit: ReturnType<typeof vi.fn> };
  alertRecordsState: ReturnType<typeof signal>;
  alertSignupDestination: ReturnType<typeof signal>;
  alertSignupFeedback: ReturnType<typeof signal>;
  alertSignupFeedbackTone: ReturnType<typeof signal>;
  alertSignupFullName: ReturnType<typeof signal>;
  alertSignupLanguage: ReturnType<typeof signal>;
  alertSignupUnsubscribeUrl: ReturnType<typeof signal>;
  forecastPeriodsState: ReturnType<typeof signal>;
  isAlertSignupDestinationValid: () => boolean;
  isAlertSignupEnabled: () => boolean;
  isLoading: ReturnType<typeof signal>;
  isRefreshing: ReturnType<typeof signal>;
  loadError: ReturnType<typeof signal>;
  locationLabel: ReturnType<typeof signal>;
  submitAlertSignup: (event?: Event) => Promise<void>;
  updateAlertSignupChannel: (value: string) => void;
  updateAlertSignupDestination: (value: string) => void;
  updateAlertSignupFullName: (value: string) => void;
  updateAlertSignupLanguage: (value: string) => void;
  weatherGovUrl: string;
  weatherPeriods: () => unknown[];
  weatherSourceLabel: () => string;
  alertSignupChannel: ReturnType<typeof signal>;
  alertSignupDestinationLabel: () => string;
  alertSignupDestinationPlaceholder: () => string;
  alertSignupDestinationType: () => string;
  alertSignupLanguageLabel: () => string;
  alertSummary: () => string;
  currentPeriod: () => { name: string } | null;
  forecastGdd: () => number;
  hasAlerts: () => boolean;
};

const DEFAULT_POINT_RESPONSE = {
  properties: {
    forecast: 'https://api.weather.gov/gridpoints/XXX/1,1/forecast',
    forecastZone: 'https://api.weather.gov/zones/forecast/COZ264',
    relativeLocation: {
      properties: {
        city: 'Wiley',
        state: 'CO',
      },
    },
  },
};

const DEFAULT_FORECAST_RESPONSE = {
  properties: {
    updatedAt: '2026-04-27T12:00:00Z',
    periods: [
      {
        name: 'Today',
        startTime: '2026-04-27T12:00:00Z',
        isDaytime: true,
        temperature: 72,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 10 },
        windSpeed: '10 to 15 mph',
        windDirection: 'NW',
        icon: 'https://example.com/icon?size=medium',
        shortForecast: 'Sunny',
        detailedForecast: 'Sunny and warm.',
      },
      {
        name: 'Tonight',
        startTime: '2026-04-27T22:00:00Z',
        isDaytime: false,
        temperature: 52,
        temperatureUnit: 'F',
        probabilityOfPrecipitation: { value: 20 },
        windSpeed: '5 mph',
        windDirection: 'S',
        icon: 'https://example.com/icon?size=medium',
        shortForecast: 'Clear',
        detailedForecast: 'Clear overnight.',
      },
    ],
  },
};

const DEFAULT_ALERT_RESPONSE = {
  features: [],
};

const PROXY_RESPONSE_WITH_ALERTS = {
  periods: DEFAULT_FORECAST_RESPONSE.properties.periods,
  alerts: [
    {
      event: 'High Wind Warning',
      headline: 'High winds expected',
      severity: 'Severe',
      urgency: 'Immediate',
      instruction: 'Stay indoors.',
    },
  ],
  updatedAt: '2026-04-27T12:00:00Z',
};

function setWeatherRuntimeConfig(config: Record<string, unknown>): void {
  (window as Window & { __TOW_RUNTIME_CONFIG__?: Record<string, unknown> }).__TOW_RUNTIME_CONFIG__ =
    {
      weather: config,
    };
  delete (window as Window & { __TOW_RUNTIME_CONFIG_OVERRIDE__?: Record<string, unknown> })
    .__TOW_RUNTIME_CONFIG_OVERRIDE__;
}

function createPanel(options: {
  weatherConfig: Record<string, unknown>;
  getImpl: (url: string) => unknown;
  postImpl?: (url: string, body: unknown) => unknown;
}) {
  const languageState = signal<'en' | 'es'>('en');
  const http = {
    get: vi.fn(options.getImpl),
    post: vi.fn(options.postImpl ?? (() => of({}))),
  } as unknown as HttpClient;

  setWeatherRuntimeConfig(options.weatherConfig);

  TestBed.configureTestingModule({
    providers: [
      { provide: HttpClient, useValue: http },
      {
        provide: SiteLanguageService,
        useValue: {
          currentLanguage: () => languageState(),
        },
      },
    ],
  });

  const panel = TestBed.runInInjectionContext(
    () => new LocalizedWeatherPanel(),
  ) as WeatherPanelHarness;

  return { panel, http, languageState };
}

async function settle(): Promise<void> {
  for (let tick = 0; tick < 10; tick += 1) {
    await Promise.resolve();
  }
}

describe('WeatherPanel', () => {
  beforeEach(() => {
    setWeatherRuntimeConfig({
      apiEndpoint: '/weather',
      allowBrowserFallback: true,
      alertSignup: {
        enabled: true,
        apiEndpoint: '/alert-signups',
      },
    });
  });

  it('derives alert-signup labels and resets feedback when the user changes channel or language', async () => {
    const { panel } = createPanel({
      weatherConfig: {
        apiEndpoint: '/weather',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: () => of(PROXY_RESPONSE_WITH_ALERTS),
    });

    await settle();

    panel.alertSignupFeedback.set('Old message');
    panel.alertSignupDestination.set('7195550102');

    expect(panel.weatherSourceLabel()).toContain(
      'weather.gov via Town of Wiley AWS weather service',
    );
    expect(panel.alertSignupDestinationLabel()).toBe('Mobile number');
    expect(panel.alertSignupDestinationPlaceholder()).toBe('(719) 555-0102');
    expect(panel.alertSignupDestinationType()).toBe('tel');
    expect(panel.alertSignupLanguageLabel()).toBe('English');

    panel.updateAlertSignupChannel('email');
    expect(panel.alertSignupDestination()).toBe('');
    expect(panel.alertSignupFeedback()).toBe(null);
    expect(panel.alertSignupDestinationLabel()).toBe('Email address');
    expect(panel.alertSignupDestinationPlaceholder()).toBe('resident@example.com');
    expect(panel.alertSignupDestinationType()).toBe('email');

    panel.updateAlertSignupLanguage('es');
    expect(panel.alertSignupLanguage()).toBe('es');
    expect(panel.alertSignupLanguageLabel()).toBe('Spanish');
  });

  it('validates alert-signup destinations for both email and SMS channels', async () => {
    const { panel } = createPanel({
      weatherConfig: {
        apiEndpoint: '/weather',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: () => of(PROXY_RESPONSE_WITH_ALERTS),
    });

    await settle();

    panel.updateAlertSignupChannel('sms');
    panel.updateAlertSignupDestination('719-555-0102');
    expect(panel.isAlertSignupDestinationValid()).toBe(true);

    panel.updateAlertSignupDestination('123');
    expect(panel.isAlertSignupDestinationValid()).toBe(false);

    panel.updateAlertSignupChannel('email');
    panel.updateAlertSignupDestination('resident@example.com');
    expect(panel.isAlertSignupDestinationValid()).toBe(true);

    panel.updateAlertSignupDestination('not-an-email');
    expect(panel.isAlertSignupDestinationValid()).toBe(false);
  });

  it('submits a valid alert signup and clears the form', async () => {
    const { panel, http } = createPanel({
      weatherConfig: {
        apiEndpoint: '/weather',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: () => of(PROXY_RESPONSE_WITH_ALERTS),
      postImpl: () =>
        of({ message: 'Request received.', unsubscribeUrl: 'https://example.com/unsub' }),
    });

    await settle();

    panel.updateAlertSignupChannel('email');
    panel.updateAlertSignupDestination('resident@example.com');
    panel.updateAlertSignupFullName('Jordan Resident');

    await panel.submitAlertSignup();

    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('/subscriptions'),
      expect.objectContaining({
        channel: 'email',
        preferredLanguage: 'en',
        destination: 'resident@example.com',
        fullName: 'Jordan Resident',
        zipCode: '81092',
      }),
    );
    expect(panel.alertSignupFeedbackTone()).toBe('success');
    expect(panel.alertSignupFeedback()).toBe('Request received.');
    expect(panel.alertSignupUnsubscribeUrl()).toBe('https://example.com/unsub');
    expect(panel.alertSignupDestination()).toBe('');
    expect(panel.alertSignupFullName()).toBe('');
  });

  it('shows validation feedback instead of posting when the signup destination is invalid', async () => {
    const { panel, http } = createPanel({
      weatherConfig: {
        apiEndpoint: '/weather',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: () => of(PROXY_RESPONSE_WITH_ALERTS),
    });

    await settle();

    panel.updateAlertSignupChannel('email');
    panel.updateAlertSignupDestination('not-an-email');

    await panel.submitAlertSignup();

    expect(http.post).not.toHaveBeenCalled();
    expect(panel.alertSignupFeedbackTone()).toBe('error');
    expect(panel.alertSignupFeedback()).toBe(
      'Enter a valid email address before signing up for severe weather alerts.',
    );
  });

  it('uses the browser feed when no proxy endpoint is configured', async () => {
    const { panel } = createPanel({
      weatherConfig: {
        apiEndpoint: '',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: (url: string) => {
        if (url === 'https://api.weather.gov/points/38.154,-102.72') {
          return of(DEFAULT_POINT_RESPONSE);
        }

        if (url === 'https://api.weather.gov/gridpoints/XXX/1,1/forecast') {
          return of(DEFAULT_FORECAST_RESPONSE);
        }

        if (url.startsWith('https://api.weather.gov/alerts/active?zone=')) {
          return of(DEFAULT_ALERT_RESPONSE);
        }

        return of(undefined);
      },
    });

    await settle();

    expect(panel.locationLabel()).toBe('Wiley, CO');
    expect(panel.isLoading()).toBe(false);
    expect(panel.hasAlerts()).toBe(false);
    expect(panel.weatherPeriods()).toHaveLength(2);
    expect(panel.currentPeriod()?.name).toBe('Today');
    expect(panel.forecastGdd()).toBe(12);
  });

  it('falls back to the browser feed when the proxy fails and fallback is enabled', async () => {
    const { panel } = createPanel({
      weatherConfig: {
        apiEndpoint: '/weather',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: (url: string) => {
        if (url === '/weather') {
          return throwError(() => new Error('Proxy down'));
        }

        if (url === 'https://api.weather.gov/points/38.154,-102.72') {
          return of(DEFAULT_POINT_RESPONSE);
        }

        if (url === 'https://api.weather.gov/gridpoints/XXX/1,1/forecast') {
          return of(DEFAULT_FORECAST_RESPONSE);
        }

        if (url.startsWith('https://api.weather.gov/alerts/active?zone=')) {
          return of(DEFAULT_ALERT_RESPONSE);
        }

        return of(undefined);
      },
    });

    await settle();

    expect(panel.loadError()).toContain('Town weather service is temporarily unavailable');
    expect(panel.isLoading()).toBe(false);
    expect(panel.isRefreshing()).toBe(false);
  });

  it('emits null when there are no active alerts and a summary when alerts exist', async () => {
    const { panel } = createPanel({
      weatherConfig: {
        apiEndpoint: '/weather',
        allowBrowserFallback: true,
        alertSignup: { enabled: true, apiEndpoint: '/alert-signups' },
      },
      getImpl: () => of(PROXY_RESPONSE_WITH_ALERTS),
    });

    await settle();

    const emitSpy = vi.spyOn(panel.activeAlertChange, 'emit');

    panel.alertRecordsState.set([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (panel as any).emitHomepageWeatherAlert();
    expect(emitSpy).toHaveBeenLastCalledWith(null);

    panel.alertRecordsState.set([
      {
        event: 'High Wind Warning',
        headline: 'High winds expected',
        severity: 'Severe',
        urgency: 'Immediate',
        instruction: 'Stay indoors.',
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (panel as any).emitHomepageWeatherAlert();

    expect(emitSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        total: 1,
        event: 'High Wind Warning',
        headline: 'High winds expected',
        severity: 'Severe',
        urgency: 'Immediate',
        forecastUrl: panel.weatherGovUrl,
      }),
    );
  });
});
