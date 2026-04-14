import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    TestRequest,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { App } from './app';
import { routes } from './app.routes';
import { DOCUMENT_HUB_TITLE_EN } from './document-hub/document-hub';
import { LocalizedWeatherPanel } from './weather-panel/localized-weather-panel';
import { MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { WILEY_THEME_PRESET } from './wiley-theme-preset';

interface TestRuntimeConfig {
  clerkSetup?: {
    clerkName?: string;
    awsAccountId?: string;
    amplifyAppId?: string;
    awsRegion?: string;
    awsConsoleUrl?: string;
    studioUrl?: string;
  };
  payments?: {
    paystar?: {
      mode?: 'none' | 'hosted' | 'api';
      portalUrl?: string;
      apiEndpoint?: string;
    };
  };
  cms?: {
    appSync?: {
      region?: string;
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
  weather?: {
    apiEndpoint?: string;
    allowBrowserFallback?: boolean;
    alertSignup?: {
      enabled?: boolean;
      apiEndpoint?: string;
    };
  };
}

describe('App', () => {
  let httpTesting: HttpTestingController;
  const runtimeWindow = window as Window & {
    __TOW_RUNTIME_CONFIG__?: TestRuntimeConfig;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: TestRuntimeConfig;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, LocalizedWeatherPanel],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        provideAnimations(),
        MessageService,
        providePrimeNG({
          theme: {
            preset: WILEY_THEME_PRESET,
            options: {
              prefix: 'p',
              darkModeSelector: false,
              cssLayer: {
                name: 'primeng',
                order: 'theme, base, primeng',
              },
            },
          },
          ripple: true,
          inputStyle: 'outlined',
          inputVariant: 'outlined',
          zIndex: {
            modal: 1100,
            overlay: 1000,
            menu: 1000,
            tooltip: 1100,
          },
        }),
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    flushPendingWeatherRequests();
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
    window.localStorage.removeItem('tow-site-language');
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
    httpTesting.verify();
  });

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(LocalizedWeatherPanel);
    fixture.detectChanges();
    await flushWeatherRequests();
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the English homepage by default', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Town of Wiley');
    expect(document.title).toContain('Official Website');
    expect(compiled.querySelector('#top-tasks h2')?.textContent).toContain('How do I');
    expect(
      compiled.querySelector('.task-card[href="/services#payment-help"]')?.textContent,
    ).toContain('Pay utility bill');
    expect(
      compiled.querySelector('.task-card[href="/services#issue-report"]')?.textContent,
    ).toContain('Report a street or utility issue');
    expect(
      compiled.querySelector('.task-card[href="/services#records-request"]')?.textContent,
    ).toContain('Request records, permits, or clerk help');
    expect(compiled.querySelector('.feature-card[href="/weather"]')?.textContent).toContain(
      'Local weather',
    );
    expect(compiled.querySelector('.feature-card[href="/records"]')?.textContent).toContain(
      'Records and documents',
    );
    expect(compiled.querySelector('.feature-card[href="/contact"]')?.textContent).toContain(
      'Contact Town Hall',
    );
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain(
      'resident services, weather alerts, meetings, records, notices, and Town Hall contacts',
    );
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toContain(
      'Town of Wiley | Official Website',
    );
    expect(compiled.querySelector('#accessibility')).toBeNull();
    expect(compiled.querySelector('.footer-links a[href="/accessibility"]')?.textContent).toContain(
      'Accessibility statement',
    );
  });

  it('should expose navigable resident-services submenu targets in the mega menu model', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as App & {
      menuItems: () => {
        label: string;
        routerLink?: string;
        fragment?: string;
        url?: string;
        items?: Array<Array<{ label: string; routerLink?: string; fragment?: string; url?: string; command?: (event: unknown) => void }>>;
      };
    };

    const servicesMenu = component.menuItems().find((item) => item.label === 'Resident services');

    expect(servicesMenu).toBeDefined();
    expect(servicesMenu?.items).toHaveLength(2);
    expect(servicesMenu?.items?.[0]).toMatchObject([
      {
        label: 'Online Payments',
        routerLink: '/services',
        fragment: 'payment-help',
        url: '/services#payment-help',
      },
      {
        label: 'Report Street/Utility Issue',
        routerLink: '/services',
        fragment: 'issue-report',
        url: '/services#issue-report',
      },
      {
        label: 'Permits & Licenses',
        routerLink: '/services',
        fragment: 'records-request',
        url: '/services#records-request',
      },
    ]);
    expect(servicesMenu?.items?.[1]).toMatchObject([
      {
        label: 'Weather & Emergency Alerts',
        routerLink: '/weather',
        url: '/weather',
      },
      {
        label: 'Language Access',
        routerLink: '/accessibility',
        url: '/accessibility',
      },
      {
        label: 'Search All Services',
        routerLink: '/',
        fragment: 'search-panel',
        url: '/#search-panel',
      },
    ]);
    expect(servicesMenu?.items?.flat().every((item) => typeof item.command === 'function')).toBe(
      true,
    );
  });

  it('should invoke the MegaMenu command exactly once and suppress the default anchor behavior', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as App & {
      activateMegaMenuItem: (item: { command?: (event: unknown) => void }, event: MouseEvent) => void;
    };
    const command = vi.fn();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      preventDefault,
      stopPropagation,
    } as unknown as MouseEvent;

    component.activateMegaMenuItem({ command }, event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(command).toHaveBeenCalledTimes(1);
    expect(command).toHaveBeenCalledWith(event);
  });

  it('should expose the meetings calendar jump link on the meetings page', async () => {
    window.history.pushState({}, '', '/meetings');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('a.text-link[href="#calendar"]')?.textContent).toContain(
      'Open the full town calendar',
    );
    expect(
      compiled.querySelector('a.text-link[href="#calendar"]')?.textContent,
    ).toContain('Open the full town calendar');
  });

  it('should map published CMS events into the meetings calendar month view', async () => {
    window.history.pushState({}, '', '/meetings');

    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      cms: {
        appSync: {
          region: 'us-east-2',
          apiEndpoint: 'https://cms.example.com/graphql',
          apiKey: 'test-public-api-key',
        },
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const cmsRequest = httpTesting.expectOne('https://cms.example.com/graphql');
    cmsRequest.flush({
      data: {
        listSiteSettings: { items: [] },
        listAlertBanners: { items: [] },
        listAnnouncements: { items: [] },
        listEvents: {
          items: [
            {
              id: 'spring-cleanup-day',
              title: 'Spring Cleanup Day',
              description: 'Bring brush, yard debris, and approved bulk items to the collection site.',
              location: 'Wiley Community Park',
              start: '2026-04-25T10:00:00-06:00',
              end: '2026-04-25T13:00:00-06:00',
              active: true,
            },
          ],
        },
        listOfficialContacts: { items: [] },
        listBusinesses: { items: [] },
        listPublicDocuments: { items: [] },
        listExternalNewsLinks: { items: [] },
      },
    });

    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as App & {
      calendarItems: () => { title: string; startDate: Date; endDate: Date }[];
      calendarOptions: () => { events: { title: string; start: Date; end: Date }[] };
    };

    expect(component.calendarItems()[0]?.title).toBe('Spring Cleanup Day');
    expect(component.calendarItems()[0]?.startDate.toISOString()).toBe('2026-04-25T16:00:00.000Z');
    expect(component.calendarOptions().events[0]).toMatchObject({
      title: 'Spring Cleanup Day',
      start: new Date('2026-04-25T10:00:00-06:00'),
      end: new Date('2026-04-25T13:00:00-06:00'),
    });
  });

  it('should render published CMS events in the meetings card list', async () => {
    window.history.pushState({}, '', '/meetings');

    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      cms: {
        appSync: {
          region: 'us-east-2',
          apiEndpoint: 'https://cms.example.com/graphql',
          apiKey: 'test-public-api-key',
        },
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const cmsRequest = httpTesting.expectOne('https://cms.example.com/graphql');
    cmsRequest.flush({
      data: {
        listSiteSettings: { items: [] },
        listAlertBanners: { items: [] },
        listAnnouncements: { items: [] },
        listEvents: {
          items: [
            {
              id: 'spring-cleanup-day',
              title: 'Spring Cleanup Day',
              description: 'Bring brush, yard debris, and approved bulk items to the collection site.',
              location: 'Wiley Community Park',
              start: '2026-04-25T10:00:00-06:00',
              end: '2026-04-25T13:00:00-06:00',
              active: true,
            },
          ],
        },
        listOfficialContacts: { items: [] },
        listBusinesses: { items: [] },
        listPublicDocuments: { items: [] },
        listExternalNewsLinks: { items: [] },
      },
    });

    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.meeting-card strong')?.textContent).toContain(
      'Spring Cleanup Day',
    );
    expect(compiled.querySelector('.meeting-card .meeting-location')?.textContent).toContain(
      'Wiley Community Park',
    );
    expect(compiled.querySelector('.meeting-card .text-link')?.getAttribute('href')).toBe(
      '/meetings#calendar',
    );
  });

  it('should render a Paystar payment action when payment runtime config is present', async () => {
    window.history.pushState({}, '', '/services');

    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      payments: {
        paystar: {
          mode: 'hosted',
          portalUrl: 'https://secure.paystar.io/townofwiley',
        },
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const paystarAction = compiled.querySelector(
      '#payment-help .payment-direct-action',
    ) as HTMLAnchorElement | null;

    expect(paystarAction?.textContent).toContain('Open secure Paystar payment portal');
    expect(paystarAction?.getAttribute('href')).toBe('https://secure.paystar.io/townofwiley');
  });

  it('should use the configured weather proxy when available', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      weather: {
        apiEndpoint: '/api/weather/nws',
        allowBrowserFallback: false,
      },
    };

    const fixture = TestBed.createComponent(LocalizedWeatherPanel);
    fixture.detectChanges();

    httpTesting.expectOne('/api/weather/nws').flush({
      locationLabel: 'Wiley, CO',
      updatedAt: '2026-03-22T12:57:10+00:00',
      periods: [
        {
          name: 'Today',
          startTime: '2026-03-22T09:00:00-06:00',
          isDaytime: true,
          temperature: 67,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 1 },
          windSpeed: '15 to 20 mph',
          windDirection: 'NE',
          icon: 'https://api.weather.gov/icons/land/day/bkn?size=medium',
          shortForecast: 'Partly Sunny',
          detailedForecast: 'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
        },
      ],
      alerts: [],
    });

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.weather-source')?.textContent).toContain('servicio AWS');
  });

  it('should render the severe weather signup form when signup runtime config is enabled', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      weather: {
        apiEndpoint: '/api/weather/nws',
        allowBrowserFallback: false,
        alertSignup: {
          enabled: true,
          apiEndpoint: 'https://alerts.example.com',
        },
      },
    };

    const fixture = TestBed.createComponent(LocalizedWeatherPanel);
    fixture.detectChanges();

    httpTesting.expectOne('/api/weather/nws').flush({
      locationLabel: 'Wiley, CO',
      updatedAt: '2026-03-22T12:57:10+00:00',
      periods: [
        {
          name: 'Today',
          startTime: '2026-03-22T09:00:00-06:00',
          isDaytime: true,
          temperature: 67,
          temperatureUnit: 'F',
          probabilityOfPrecipitation: { value: 1 },
          windSpeed: '15 to 20 mph',
          windDirection: 'NE',
          icon: 'https://api.weather.gov/icons/land/day/bkn?size=medium',
          shortForecast: 'Partly Sunny',
          detailedForecast: 'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
        },
      ],
      alerts: [],
    });

    fixture.detectChanges();
    await Promise.resolve();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as LocalizedWeatherPanel & {
      isAlertSignupEnabled: () => boolean;
      alertSignupSubmitLabel: () => string;
      alertSignupLanguageLabel: () => string;
      alertSignupChannel: () => string;
      updateAlertSignupLanguage: (value: string) => void;
    };

    expect(component.isAlertSignupEnabled()).toBe(true);
    expect(component.alertSignupSubmitLabel()).toBe('Suscribirse a alertas');
    expect(component.alertSignupLanguageLabel()).toBe('English');
    expect(component.alertSignupChannel()).toBe('sms');

    component.updateAlertSignupLanguage('es');
    fixture.detectChanges();

    expect(component.alertSignupLanguageLabel()).toBe('Espanol');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Idioma de la alerta');
  });

  it('should elevate active NWS alerts into the homepage banner', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await flushWeatherRequests([
      {
        properties: {
          event: 'Severe Thunderstorm Warning',
          headline: 'Severe Thunderstorm Warning issued March 22 at 7:15 PM MDT.',
          severity: 'Severe',
          urgency: 'Immediate',
          instruction: 'Move indoors and stay away from windows until the storm passes.',
          expires: '2026-03-22T20:00:00-06:00',
        },
      },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-alert-label')?.textContent).toContain('Servicio Nacional');
    expect(compiled.querySelector('.site-alert-title')?.textContent).toContain(
      'Severe Thunderstorm Warning',
    );
    expect(compiled.querySelector('.site-alert-detail')?.textContent).toContain(
      'Severe Thunderstorm Warning issued',
    );
  });

  it('should render the clerk editor on the admin path', async () => {
    window.localStorage.setItem('tow-site-language', 'es');
    window.history.pushState({}, '', '/admin');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-title')?.textContent).toContain(
      'Un solo lugar para actualizar el sitio del pueblo',
    );
    expect(compiled.textContent).toContain('Event');
    expect(compiled.textContent).toContain('EmailAlias');
    expect(compiled.textContent).toContain(
      'Esta pagina solo muestra guia y estado actual del CMS. No guarda ni publica contenido del sitio.',
    );
    expect(compiled.textContent).toContain('Abrir instrucciones del personal');
    expect(compiled.textContent).toContain('Referencia rapida');
    expect(compiled.textContent).toContain('Copia de las instrucciones de la secretaria');
    expect(compiled.querySelector('.cms-button.primary')?.textContent).toContain(
      'Abrir pagina de edicion del CMS',
    );
  });

  it('should render the Deb Dillon clerk setup page on the clerk setup path', async () => {
    window.history.pushState({}, '', '/clerk-setup');

    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      clerkSetup: {
        clerkName: 'Deb Dillon',
        awsAccountId: '570912405222',
        amplifyAppId: 'd331voxr1fhoir',
        awsRegion: 'us-east-2',
        awsConsoleUrl: 'https://us-east-2.console.aws.amazon.com/',
        studioUrl:
          'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home',
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.setup-card h1')?.textContent).toContain('One-time IAM setup');
    expect(compiled.textContent).toContain('Welcome, Deb Dillon.');
    expect(compiled.textContent).toContain('Prepopulated Town account details');
    expect(compiled.textContent).toContain('AWS account: 570912405222');
    expect(compiled.textContent).toContain('Amplify app: d331voxr1fhoir');
    expect(compiled.textContent).toContain('Open Studio Home');
    expect(compiled.textContent).toContain('Amplify Studio Data Manager');
  });

  it('should open the document publishing tab from the clerk setup fragment', async () => {
    window.history.pushState({}, '', '/clerk-setup#documents');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(
      'Use the supported Studio PublicDocument workflow for downloadable files.',
    );
    expect(compiled.textContent).toContain('Supported document workflow');
    expect(compiled.textContent).toContain('Website section map');
    expect(compiled.textContent).toContain('Meeting Documents');
    expect(compiled.textContent).toContain('meeting-documents');
    expect(compiled.textContent).toContain('Open CMS Admin');
  });

  it('should link the admin upload button to the clerk setup document tab', async () => {
    window.history.pushState({}, '', '/admin');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-button.add')?.getAttribute('href')).toBe(
      '/clerk-setup#documents',
    );
  });

  it('should render the public document hub on the documents path', async () => {
    window.history.pushState({}, '', '/documents');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="document-hub-title"]')?.textContent).toContain(
      DOCUMENT_HUB_TITLE_EN,
    );
    expect(compiled.querySelector('#meeting-documents')?.textContent).toContain(
      'City Council packets and approved minutes',
    );
    expect(compiled.querySelector('#records-requests h2')?.textContent).toContain(
      'Public records and FOIA requests',
    );
    expect(compiled.querySelector('.document-hub-button.primary')?.getAttribute('href')).toBe(
      '/services#records-request',
    );
  });

  it('should fall back to the public NWS feed when the configured proxy fails', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      weather: {
        apiEndpoint: '/api/weather/nws',
        allowBrowserFallback: true,
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting.expectOne('/api/weather/nws').flush('proxy unavailable', {
      status: 502,
      statusText: 'Bad Gateway',
    });

    await flushWeatherRequests();
    await Promise.resolve();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('volvio al canal publico del Servicio Nacional');
  });

  async function flushWeatherRequests(
    alertFeatures: {
      properties: {
        event: string;
        headline?: string;
        severity?: string;
        urgency?: string;
        description?: string;
        instruction?: string;
        expires?: string;
      };
    }[] = [],
  ): Promise<void> {
    const pointRequest = await waitForRequest('https://api.weather.gov/points/38.154,-102.72');

    pointRequest.flush({
      properties: {
        forecast: 'https://api.weather.gov/gridpoints/PUB/162,56/forecast',
        forecastZone: 'https://api.weather.gov/zones/forecast/COZ098',
        relativeLocation: {
          properties: {
            city: 'Wiley',
            state: 'CO',
          },
        },
      },
    });

    await Promise.resolve();

    const forecastRequest = await waitForRequest(
      'https://api.weather.gov/gridpoints/PUB/162,56/forecast',
    );
    forecastRequest.flush({
      properties: {
        updatedAt: '2026-03-22T12:57:10+00:00',
        periods: [
          {
            name: 'Today',
            startTime: '2026-03-22T09:00:00-06:00',
            isDaytime: true,
            temperature: 67,
            temperatureUnit: 'F',
            probabilityOfPrecipitation: { value: 1 },
            windSpeed: '15 to 20 mph',
            windDirection: 'NE',
            icon: 'https://api.weather.gov/icons/land/day/bkn?size=medium',
            shortForecast: 'Partly Sunny',
            detailedForecast: 'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
          },
          {
            name: 'Tonight',
            startTime: '2026-03-22T18:00:00-06:00',
            isDaytime: false,
            temperature: 36,
            temperatureUnit: 'F',
            probabilityOfPrecipitation: { value: 1 },
            windSpeed: '5 to 15 mph',
            windDirection: 'ESE',
            icon: 'https://api.weather.gov/icons/land/night/bkn?size=medium',
            shortForecast: 'Mostly Cloudy',
            detailedForecast: 'Mostly cloudy, with a low around 36.',
          },
          {
            name: 'Monday',
            startTime: '2026-03-23T06:00:00-06:00',
            isDaytime: true,
            temperature: 73,
            temperatureUnit: 'F',
            probabilityOfPrecipitation: { value: 0 },
            windSpeed: '10 to 30 mph',
            windDirection: 'SE',
            icon: 'https://api.weather.gov/icons/land/day/wind_bkn?size=medium',
            shortForecast: 'Partly Sunny',
            detailedForecast: 'Partly sunny, with a high near 73.',
          },
          {
            name: 'Monday Night',
            startTime: '2026-03-23T18:00:00-06:00',
            isDaytime: false,
            temperature: 36,
            temperatureUnit: 'F',
            probabilityOfPrecipitation: { value: 2 },
            windSpeed: '5 to 25 mph',
            windDirection: 'SE',
            icon: 'https://api.weather.gov/icons/land/night/wind_sct?size=medium',
            shortForecast: 'Partly Cloudy',
            detailedForecast: 'Partly cloudy, with a low around 36.',
          },
          {
            name: 'Tuesday',
            startTime: '2026-03-24T06:00:00-06:00',
            isDaytime: true,
            temperature: 88,
            temperatureUnit: 'F',
            probabilityOfPrecipitation: { value: 0 },
            windSpeed: '5 to 10 mph',
            windDirection: 'SSW',
            icon: 'https://api.weather.gov/icons/land/day/sct?size=medium',
            shortForecast: 'Mostly Sunny',
            detailedForecast: 'Mostly sunny, with a high near 88.',
          },
        ],
      },
    });

    const alertsRequest = await waitForRequest('https://api.weather.gov/alerts/active?zone=COZ098');
    alertsRequest.flush({
      features: alertFeatures,
    });

    await Promise.resolve();
  }

  async function waitForRequest(url: string): Promise<TestRequest> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const matches = httpTesting.match(url);

      if (matches.length) {
        return matches[0];
      }

      await Promise.resolve();
    }

    throw new Error(`Timed out waiting for request: ${url}`);
  }

  function flushPendingWeatherRequests(): void {
    const directRequests = [
      {
        url: 'https://api.weather.gov/points/38.154,-102.72',
        body: {
          properties: {
            forecast: 'https://api.weather.gov/gridpoints/PUB/162,56/forecast',
            forecastZone: 'https://api.weather.gov/zones/forecast/COZ098',
            relativeLocation: {
              properties: {
                city: 'Wiley',
                state: 'CO',
              },
            },
          },
        },
      },
      {
        url: 'https://api.weather.gov/gridpoints/PUB/162,56/forecast',
        body: {
          properties: {
            updatedAt: '2026-03-22T12:57:10+00:00',
            periods: [
              {
                name: 'Today',
                startTime: '2026-03-22T09:00:00-06:00',
                isDaytime: true,
                temperature: 67,
                temperatureUnit: 'F',
                probabilityOfPrecipitation: { value: 1 },
                windSpeed: '15 to 20 mph',
                windDirection: 'NE',
                icon: 'https://api.weather.gov/icons/land/day/bkn?size=medium',
                shortForecast: 'Partly Sunny',
                detailedForecast: 'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
              },
              {
                name: 'Tonight',
                startTime: '2026-03-22T18:00:00-06:00',
                isDaytime: false,
                temperature: 36,
                temperatureUnit: 'F',
                probabilityOfPrecipitation: { value: 1 },
                windSpeed: '5 to 15 mph',
                windDirection: 'ESE',
                icon: 'https://api.weather.gov/icons/land/night/bkn?size=medium',
                shortForecast: 'Mostly Cloudy',
                detailedForecast: 'Mostly cloudy, with a low around 36.',
              },
              {
                name: 'Monday',
                startTime: '2026-03-23T06:00:00-06:00',
                isDaytime: true,
                temperature: 73,
                temperatureUnit: 'F',
                probabilityOfPrecipitation: { value: 0 },
                windSpeed: '10 to 30 mph',
                windDirection: 'SE',
                icon: 'https://api.weather.gov/icons/land/day/wind_bkn?size=medium',
                shortForecast: 'Partly Sunny',
                detailedForecast: 'Partly sunny, with a high near 73.',
              },
              {
                name: 'Monday Night',
                startTime: '2026-03-23T18:00:00-06:00',
                isDaytime: false,
                temperature: 36,
                temperatureUnit: 'F',
                probabilityOfPrecipitation: { value: 2 },
                windSpeed: '5 to 25 mph',
                windDirection: 'SE',
                icon: 'https://api.weather.gov/icons/land/night/wind_sct?size=medium',
                shortForecast: 'Partly Cloudy',
                detailedForecast: 'Partly cloudy, with a low around 36.',
              },
              {
                name: 'Tuesday',
                startTime: '2026-03-24T06:00:00-06:00',
                isDaytime: true,
                temperature: 88,
                temperatureUnit: 'F',
                probabilityOfPrecipitation: { value: 0 },
                windSpeed: '5 to 10 mph',
                windDirection: 'SSW',
                icon: 'https://api.weather.gov/icons/land/day/sct?size=medium',
                shortForecast: 'Mostly Sunny',
                detailedForecast: 'Mostly sunny, with a high near 88.',
              },
            ],
          },
        },
      },
      {
        url: 'https://api.weather.gov/alerts/active?zone=COZ098',
        body: {
          features: [],
        },
      },
    ];

    for (const requestConfig of directRequests) {
      for (const request of httpTesting.match(requestConfig.url)) {
        request.flush(requestConfig.body);
      }
    }

    const runtimeWeatherConfig = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG__?.weather ?? {}),
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.weather ?? {}),
    };

    if (typeof runtimeWeatherConfig.apiEndpoint === 'string' && runtimeWeatherConfig.apiEndpoint) {
      for (const request of httpTesting.match(runtimeWeatherConfig.apiEndpoint)) {
        request.flush({
          locationLabel: 'Wiley, CO',
          updatedAt: '2026-03-22T12:57:10+00:00',
          periods: [
            {
              name: 'Today',
              startTime: '2026-03-22T09:00:00-06:00',
              isDaytime: true,
              temperature: 67,
              temperatureUnit: 'F',
              probabilityOfPrecipitation: { value: 1 },
              windSpeed: '15 to 20 mph',
              windDirection: 'NE',
              icon: null,
              shortForecast: 'Partly Sunny',
              detailedForecast: 'Partly sunny, with a high near 67. Northeast wind 15 to 20 mph.',
            },
            {
              name: 'Tonight',
              startTime: '2026-03-22T18:00:00-06:00',
              isDaytime: false,
              temperature: 36,
              temperatureUnit: 'F',
              probabilityOfPrecipitation: { value: 1 },
              windSpeed: '5 to 15 mph',
              windDirection: 'ESE',
              icon: null,
              shortForecast: 'Mostly Cloudy',
              detailedForecast: 'Mostly cloudy, with a low around 36.',
            },
          ],
          alerts: [],
        });
      }
    }

    for (const request of httpTesting.match('/api/contact-updates-review')) {
      request.flush([]);
    }
  }
});
