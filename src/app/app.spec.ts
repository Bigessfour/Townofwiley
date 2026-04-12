import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    TestRequest,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DOCUMENT_HUB_TITLE_EN } from './document-hub/document-hub';
import { LocalizedWeatherPanel } from './weather-panel/localized-weather-panel';

interface TestRuntimeConfig {
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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
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
    expect(compiled.querySelector('#site-search')).toBeTruthy();
    expect(compiled.querySelector('.search-submit')?.textContent).toContain('Search');
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

  it('should send the top calendar actions to the meetings calendar section', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.header-meta-link[href="/meetings#calendar"]')?.textContent).toContain(
      'Open the full town calendar',
    );
    expect(
      compiled.querySelector('.header-meta-link[href="/meetings#calendar"]')?.textContent,
    ).toContain('Open the full town calendar');
  });

  it('should scroll to the calendar section when the top calendar action is used on the meetings page', async () => {
    window.history.pushState({}, '', '/meetings');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const calendarPanel = compiled.querySelector('#calendar') as HTMLElement;
    const scrollIntoViewSpy = vi.spyOn(calendarPanel, 'scrollIntoView');
    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const topCalendarLink = compiled.querySelector(
      '.header-meta-link[href="/meetings#calendar"]',
    ) as HTMLAnchorElement;

    topCalendarLink.click();
    await Promise.resolve();

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(replaceStateSpy).toHaveBeenCalledWith(window.history.state, '', '/meetings#calendar');
    expect(document.activeElement).toBe(calendarPanel);
  });

  it('should navigate to meetings with calendar fragment when calendar action is used not on meetings page', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const compiled = fixture.nativeElement as HTMLElement;
    const topCalendarLink = compiled.querySelector(
      '.header-meta-link[href="/meetings#calendar"]',
    ) as HTMLAnchorElement;

    topCalendarLink.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/meetings'], { fragment: 'calendar' });
  });

  it('should route document-related search queries into the public document hub', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchInput = compiled.querySelector('#site-search') as HTMLInputElement;

    searchInput.value = 'Budget summaries and annual reports';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 150));
    fixture.detectChanges();
    await fixture.whenStable();

    const financeResult = compiled.querySelector(
      '.search-result[href="/documents#financial-documents"]',
    );

    expect(financeResult?.querySelector('strong')?.textContent).toContain(
      'Find budget summaries and annual reports',
    );

    searchInput.value = 'public records checklist';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 150));
    fixture.detectChanges();
    await fixture.whenStable();

    const archiveResult = compiled.querySelector(
      '.search-result[href="/documents/archive/public-records-request-checklist.html"]',
    );

    expect(archiveResult?.textContent).toContain('Public Records Request Checklist');
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

  it('should switch the homepage language to English when selected', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();

    const englishButton = fixture.nativeElement.querySelector(
      '#site-language-en',
    ) as HTMLButtonElement;
    englishButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Town of Wiley');
    expect(compiled.querySelector('#top-tasks h2')?.textContent).toContain('How do I');
    expect(compiled.querySelector('.search-submit')?.textContent).toContain('Search');
    expect(compiled.querySelector('.footer-links')?.textContent).toContain(
      'Accessibility statement',
    );
  });

  it('should render homepage content from Amplify Studio CMS when AppSync runtime config is present', async () => {
    window.localStorage.setItem('tow-site-language', 'es');

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
    expect(cmsRequest.request.method).toBe('POST');
    expect(cmsRequest.request.headers.get('x-api-key')).toBe('test-public-api-key');
    cmsRequest.flush({
      data: {
        listSiteSettings: {
          items: [
            {
              townName: 'Town of Wiley',
              heroEyebrow: 'Town Website',
              heroStatus: 'Open for Residents',
              heroTitle: 'Wiley Community Updates',
              heroMessage:
                'Find the latest notices, meeting updates, and town information in one place.',
              heroSubtext:
                'This version highlights emergency notices and resident-facing updates first.',
              welcomeLabel: 'Welcome Photo',
              welcomeHeading: 'A fresh homepage for Wiley residents',
              welcomeBody:
                'The welcome area now explains what residents can do on the site right away.',
              welcomeCaption: 'Updated caption for the Wiley homepage photo.',
            },
          ],
        },
        listAlertBanners: {
          items: [
            {
              id: 'alert-1',
              enabled: true,
              label: 'Emergency Notice',
              title: 'Main Street closed tonight',
              detail: 'Crews will close Main Street from 8 PM until midnight for utility repairs.',
              linkLabel: 'Call Town Hall',
              linkHref: 'tel:+17198294974',
              updatedAt: '2026-03-22T18:00:00Z',
            },
          ],
        },
        listAnnouncements: {
          items: [
            {
              id: 'launch-banner',
              title: "Welcome to Wiley's New Website",
              date: '2026-03-30',
              detail:
                'We developed this website in house to better offer Wiley Residents quality services.',
              priority: 0,
              active: true,
            },
            {
              id: 'water-outage',
              title: 'Water outage on Main Street',
              date: '2026-03-22',
              detail: 'Crews will repair a broken main from 10 PM until approximately 2 AM.',
              priority: 1,
              active: true,
            },
          ],
        },
        listEvents: {
          items: [
            {
              id: 'spring-cleanup-day',
              title: 'Spring Cleanup Day',
              description:
                'Bring brush, yard debris, and approved bulk items to the collection site.',
              location: 'Wiley Community Park',
              start: '2026-04-25T10:00:00-06:00',
              end: '2026-04-25T13:00:00-06:00',
              active: true,
            },
          ],
        },
        listOfficialContacts: {
          items: [
            {
              id: 'clerk-desk',
              label: 'Clerk Desk',
              value: 'Deb Dillon',
              detail: 'Call or email for meeting packets and town records requests.',
              href: 'mailto:deb.dillon@townofwiley.gov',
              linkLabel: 'deb.dillon@townofwiley.gov',
              displayOrder: 1,
            },
          ],
        },
      },
    });

    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Actualizaciones comunitarias');
    expect(compiled.querySelector('.site-alert-button')?.textContent).toContain('alertas');
    expect(compiled.querySelector('.site-alert-title')?.textContent).toContain(
      'Main Street cerrada',
    );
    expect(compiled.querySelector('.feature-card[href="/notices"]')?.textContent).toContain(
      'Corte de agua',
    );
    expect(compiled.textContent).not.toContain("Welcome to Wiley's New Website");
    expect(compiled.querySelector('.feature-card[href="/meetings"]')?.textContent).toContain(
      'Spring Cleanup Day',
    );
    expect(compiled.querySelector('.feature-card[href="/contact"]')?.textContent).toContain(
      'Deb Dillon',
    );

    const searchInput = compiled.querySelector('#site-search') as HTMLInputElement;
    searchInput.value = 'spring cleanup';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 150));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compiled.querySelector('.search-result strong')?.textContent).toContain(
      'Spring Cleanup Day',
    );

    searchInput.value = 'deb dillon';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 150));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      compiled.querySelector('.search-result[href="mailto:deb.dillon@townofwiley.gov"]')
        ?.textContent,
    ).toContain('Deb Dillon');
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
    expect(compiled.textContent).toContain('Esta pagina solo es una guia y una verificacion de estado');
    expect(compiled.textContent).toContain('Abrir instrucciones del personal');
    expect(compiled.textContent).toContain('Referencia rapida');
    expect(compiled.textContent).toContain('Copia de las instrucciones de la secretaria');
    expect(compiled.querySelector('.cms-button.primary')?.textContent).toContain(
      'Abrir pagina de edicion del CMS',
    );
  });

  it('should render the Deb Dillon clerk setup page on the clerk setup path', async () => {
    window.history.pushState({}, '', '/clerk-setup');

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
