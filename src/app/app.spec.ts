import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { MessageService, type MegaMenuItem } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { App, APP_COPY } from './app';
import { routes } from './app.routes';
import { DOCUMENT_HUB_TITLE_EN } from './document-hub/document-hub';
import {
  LocalizedWeatherPanel,
  type HomepageWeatherAlert,
} from './weather-panel/localized-weather-panel';
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
    window.localStorage.setItem('tow-site-language', 'en');
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

    // Route all weather calls through the local proxy by default so tests get
    // a single, synchronous HTTP exchange instead of the multi-step NWS chain.
    runtimeWindow.__TOW_RUNTIME_CONFIG__ = {
      weather: {
        apiEndpoint: '/api/weather/nws',
        allowBrowserFallback: false,
        alertSignup: {
          enabled: false,
          apiEndpoint: '',
        },
      },
    };
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
    const expectedTopTaskTitles = APP_COPY.en.topTasks.map((task) => task.title);
    const topTasksModel = (
      fixture.componentInstance as unknown as {
        topTasks: () => typeof APP_COPY.en.topTasks;
      }
    ).topTasks();
    expect(topTasksModel.map((task) => task.title)).toEqual(expectedTopTaskTitles);

    const taskAnchors = compiled.querySelectorAll('a.task-card');
    expect(taskAnchors.length).toBe(expectedTopTaskTitles.length);
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
    expect(compiled.querySelector('#search-panel')).not.toBeNull();
    expect(compiled.querySelector('#search-panel h2')?.textContent).toContain(
      'Search Wiley services',
    );
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
      menuItems: () => MegaMenuItem[];
    };

    const servicesMenu = component.menuItems().find((item) => item.label === 'Services & Permits');

    expect(component.menuItems().every((item) => item['root'] === true)).toBe(true);
    expect(servicesMenu).toBeDefined();
    expect(servicesMenu?.items).toHaveLength(2);

    /** Matches megaMenuColumn() in app.ts: each overlay column is `[{ items: leafLinks[] }]`. */
    const firstColumnGroup = servicesMenu?.items?.[0]?.[0];
    const secondColumnGroup = servicesMenu?.items?.[1]?.[0];

    expect(firstColumnGroup?.items).toMatchObject([
      {
        label: 'Online Payments',
        routerLink: ['/services'],
        fragment: 'payment-help',
      },
      {
        label: 'Report Street/Utility Issue',
        routerLink: ['/services'],
        fragment: 'issue-report',
      },
      {
        label: 'Permits & Licenses',
        routerLink: ['/services'],
        fragment: 'records-request',
      },
      {
        label: 'Resident services',
        routerLink: '/services',
      },
    ]);
    expect(secondColumnGroup?.items).toMatchObject([
      {
        label: 'Records and documents',
        routerLink: '/records',
      },
      {
        label: 'Permits & Licenses',
        routerLink: '/services',
      },
    ]);
  });

  it('should keep non-core public routes lazy-loaded', () => {
    const lazyLeafRoutes = routes.filter(
      (route) => route.path !== '' && route.redirectTo == null,
    );
    expect(lazyLeafRoutes.every((route) => Boolean(route.loadComponent))).toBe(true);
  });

  it('should invoke the MegaMenu command exactly once and suppress the default anchor behavior', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as App & {
      activateMegaMenuItem: (
        item: { command?: (event: unknown) => void },
        event: MouseEvent,
      ) => void;
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

  it('should expose the meetings calendar jump link on the homepage', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    const calendarJump = compiled.querySelector('a.text-link[href="/meetings#calendar"]');
    expect(calendarJump?.textContent).toContain('Open the full town calendar');
  });

  it('should map published CMS events into the meetings calendar month view', async () => {
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
              description:
                'Bring brush, yard debris, and approved bulk items to the collection site.',
              location: 'Wiley Community Park',
              start: '2026-06-15T10:00:00-06:00',
              end: '2026-06-15T13:00:00-06:00',
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

    await TestBed.inject(Router).navigateByUrl('/meetings');
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as App & {
      calendarItems: () => { title: string; startDate: Date; endDate: Date }[];
      calendarOptions: () => { events: { title: string; start: Date; end: Date }[] };
    };

    expect(component.calendarItems()[0]?.title).toBe('Spring Cleanup Day');
    expect(component.calendarItems()[0]?.startDate.toISOString()).toBe('2026-06-15T16:00:00.000Z');
    expect(component.calendarOptions().events[0]).toMatchObject({
      title: 'Spring Cleanup Day',
      start: new Date('2026-06-15T10:00:00-06:00'),
      end: new Date('2026-06-15T13:00:00-06:00'),
    });
  });

  it('should render published CMS events in the meetings card list', async () => {
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
              description:
                'Bring brush, yard debris, and approved bulk items to the collection site.',
              location: 'Wiley Community Park',
              start: '2026-06-15T10:00:00-06:00',
              end: '2026-06-15T13:00:00-06:00',
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

    await TestBed.inject(Router).navigateByUrl('/meetings');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const meetingTitle = compiled.querySelector(
      '.meetings-table tbody tr .meetings-cell-title strong',
    );
    expect(meetingTitle?.textContent ?? '').toContain('Spring Cleanup Day');
    const meetingLocation = compiled.querySelector('.meetings-table tbody tr .meeting-location');
    expect(meetingLocation?.textContent ?? '').toContain('Wiley Community Park');
    expect(compiled.querySelector('#calendar')).not.toBeNull();
  });

  it('should render a Paystar payment action when payment runtime config is present', async () => {
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
    await TestBed.inject(Router).navigateByUrl('/services');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const paystarAction = compiled.querySelector(
      '#payment-help .resident-pay-card-actions a[href="https://secure.paystar.io/townofwiley"]',
    ) as HTMLAnchorElement | null;

    expect(paystarAction).not.toBeNull();
    expect(paystarAction?.textContent ?? '').toContain('Pay now with Paystar');
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

    // Force the browser NWS chain so this test exercises api.weather.gov parsing
    // independent of the production proxy path.
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      weather: {
        apiEndpoint: '',
        allowBrowserFallback: true,
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting.expectOne('https://api.weather.gov/points/38.154,-102.72').flush({
      properties: { forecastZone: 'https://api.weather.gov/zones/forecast/COZ098' },
    });
    await Promise.resolve();
    httpTesting.expectOne('https://api.weather.gov/alerts/active?zone=COZ098').flush({
      features: [
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
      ],
    });
    // Allow the loadAlert() async chain to process the response before change detection.
    await Promise.resolve();

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-alert--nws .site-alert-headline')?.textContent).toContain(
      'Servicio Nacional',
    );
    expect(compiled.querySelector('.site-alert--nws .site-alert-title')?.textContent).toContain(
      'Severe Thunderstorm Warning',
    );
    expect(compiled.querySelector('.site-alert--nws .site-alert-detail')?.textContent).toContain(
      'Severe Thunderstorm Warning issued',
    );
  });

  it('should elevate active NWS alerts into the homepage banner from the configured proxy', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const proxyPayload = {
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
      alerts: [
        {
          event: 'Severe Thunderstorm Warning',
          headline: 'Severe Thunderstorm Warning issued March 22 at 7:15 PM MDT.',
          severity: 'Severe',
          urgency: 'Immediate',
          instruction: 'Move indoors and stay away from windows until the storm passes.',
          expires: '2026-03-22T20:00:00-06:00',
        },
      ],
    };

    for (const req of httpTesting.match('/api/weather/nws')) {
      req.flush(proxyPayload);
    }
    await Promise.resolve();

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-alert--nws .site-alert-headline')?.textContent).toContain(
      'Servicio Nacional',
    );
    expect(compiled.querySelector('.site-alert--nws .site-alert-title')?.textContent).toContain(
      'Severe Thunderstorm Warning',
    );
    expect(compiled.querySelector('.site-alert--nws .site-alert-detail')?.textContent).toContain(
      'Severe Thunderstorm Warning issued',
    );
  });

  it('should hide the NWS banner when dismissed and show again when the alert payload changes', async () => {
    window.localStorage.setItem('tow-site-language', 'en');

    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      weather: {
        apiEndpoint: '',
        allowBrowserFallback: true,
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting.expectOne('https://api.weather.gov/points/38.154,-102.72').flush({
      properties: { forecastZone: 'https://api.weather.gov/zones/forecast/COZ098' },
    });
    await Promise.resolve();
    httpTesting.expectOne('https://api.weather.gov/alerts/active?zone=COZ098').flush({
      features: [
        {
          properties: {
            event: 'Frost Advisory',
            headline:
              'Frost Advisory issued May 1 at 6:56 PM MDT until May 2 at 8:00 AM MDT by NWS Pueblo CO.',
            severity: 'Minor',
            urgency: 'Expected',
            instruction:
              'Protect sensitive plants from frost; cover or bring indoors where possible.',
          },
        },
      ],
    });
    await Promise.resolve();

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-alert--nws')).not.toBeNull();

    const dismiss = compiled.querySelector(
      'button[aria-label="Dismiss weather alert"]',
    ) as HTMLButtonElement | null;
    expect(dismiss).not.toBeNull();
    dismiss!.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.site-alert--nws')).toBeNull();

    const inst = fixture.componentInstance as unknown as {
      updateHomepageWeatherAlert(alert: HomepageWeatherAlert | null): void;
    };
    inst.updateHomepageWeatherAlert({
      total: 1,
      event: 'Frost Advisory',
      headline:
        'Frost Advisory issued May 2 at 9:00 PM MDT until May 3 at 8:00 AM MDT by NWS Pueblo CO.',
      severity: 'Minor',
      urgency: 'Expected',
      instruction: 'Protect sensitive plants from frost; cover or bring indoors where possible.',
      forecastUrl: 'https://forecast.weather.gov/MapClick.php?lat=38.155356&lon=-102.719248',
    });
    fixture.detectChanges();

    expect(compiled.querySelector('.site-alert--nws')).not.toBeNull();
  });

  it('should not show emergency alert copy when NWS has no active alerts', async () => {
    runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      weather: {
        apiEndpoint: '',
        allowBrowserFallback: true,
      },
    };

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    httpTesting.expectOne('https://api.weather.gov/points/38.154,-102.72').flush({
      properties: { forecastZone: 'https://api.weather.gov/zones/forecast/COZ098' },
    });
    await Promise.resolve();
    httpTesting.expectOne('https://api.weather.gov/alerts/active?zone=COZ098').flush({
      features: [],
    });
    await Promise.resolve();

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-alert--nws')).toBeNull();
    expect(compiled.querySelector('.site-alert-slot--live-nws')).toBeNull();
    expect(compiled.textContent).not.toContain('Urgent town update');
    expect(compiled.textContent).not.toContain('Weather alerts load here');
  });

  it('should render the clerk editor on the admin path', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/admin');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-title')?.textContent).toContain(
      'Administracion de contenido del Pueblo de Wiley',
    );
    expect(compiled.textContent).toContain('Event');
    expect(compiled.textContent).toContain('EmailAlias');
    expect(compiled.textContent).toContain(
      'Esta pagina solo muestra guia y estado actual del CMS. No guarda ni publica contenido del sitio.',
    );
    expect(compiled.textContent).toContain('Configuracion y credenciales');
    expect(compiled.textContent).toContain('Referencia rapida');
    expect(compiled.textContent).toContain('Copia de las instrucciones de la secretaria');
    expect(compiled.querySelector('.cms-button.primary')?.textContent).toContain(
      'Abrir Amplify Studio Data Manager',
    );
  });

  it('should render the Deb Dillon setup details on the admin hub path', async () => {
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
    await TestBed.inject(Router).navigateByUrl('/admin');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-title')?.textContent).toContain(
      'Town of Wiley Content Management',
    );
    expect(compiled.textContent).toContain('Setup & credentials');
    expect(compiled.textContent).toContain('570912405222');
    expect(compiled.textContent).toContain('d331voxr1fhoir');
    expect(compiled.textContent).toContain('Open Studio Home');
    expect(compiled.textContent).toContain('Amplify Studio Data Manager');
  });

  it('should redirect the clerk setup document fragment to the admin document tab', async () => {
    // Pre-set the hash so the legacy redirect preserves the intended admin tab.
    window.history.replaceState({}, '', '/clerk-setup#documents');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/clerk-setup#documents');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/admin#documents');
    expect(compiled.textContent).toContain('Supported document workflow');
    expect(compiled.textContent).toContain('Supported document workflow');
    expect(compiled.textContent).toContain('Website section map');
    expect(compiled.textContent).toContain('Meeting Documents');
    expect(compiled.textContent).toContain('meeting-documents');
    expect(compiled.textContent).toContain('Open Amplify Studio Data Manager');
  });

  it('should link the admin document button to the admin document tab', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/admin');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-button.add')?.getAttribute('href')).toBe(
      '/admin#documents',
    );
  });

  it('should render the public document hub on the documents path', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/documents');
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

    const fixture = TestBed.createComponent(LocalizedWeatherPanel);
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

  interface AlertFeature {
    properties: {
      event: string;
      headline?: string;
      severity?: string;
      urgency?: string;
      description?: string;
      instruction?: string;
      expires?: string;
    };
  }

  /**
   * Flush pending weather HTTP request(s) after detectChanges().
   *
   * By default the test suite configures the proxy endpoint so the weather panel
   * and homepage alert primer each issue GET /api/weather/nws (primer uses the proxy
   * when configured, matching production).
   * the proxy or the multi-step NWS direct chain is active and handles both.
   *
   * For the "fall back" scenario: the test manually flushes the proxy with a
   * 502 before calling this helper, so the proxy slot is already consumed.
   * When allowBrowserFallback is true, this helper falls through to the
   * three-step NWS direct chain (points → forecast → alerts).
   */
  async function flushWeatherRequests(alertFeatures: AlertFeature[] = []): Promise<void> {
    const effectiveWeather = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG__?.weather ?? {}),
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.weather ?? {}),
    };
    const proxyEndpoint =
      typeof effectiveWeather.apiEndpoint === 'string' ? effectiveWeather.apiEndpoint : '';

    if (proxyEndpoint) {
      const proxyReqs = httpTesting.match(proxyEndpoint);

      if (proxyReqs.length > 0) {
        // Proxy request is pending — flush it with the canonical proxy response.
        for (const req of proxyReqs) {
          req.flush({
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
            // Proxy returns alerts as a flat array of NwsAlertProperties.
            alerts: alertFeatures.map((f) => f.properties),
          });
        }
      } else if (effectiveWeather.allowBrowserFallback) {
        // Proxy was already consumed by the test (e.g. flushed with 502).
        // Give the error handler one microtask to schedule the NWS fallback.
        await Promise.resolve();
        await flushNWSDirectChain(alertFeatures);
      }
      // else: proxy configured, no fallback — nothing else to flush.
    } else {
      await flushNWSDirectChain(alertFeatures);
    }
  }

  /** Flush the three-step NWS direct chain: points → forecast → alerts. */
  async function flushNWSDirectChain(alertFeatures: AlertFeature[] = []): Promise<void> {
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
    alertsRequest.flush({ features: alertFeatures });

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
