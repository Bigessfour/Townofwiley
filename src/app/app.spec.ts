import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { LocalizedWeatherPanel } from './weather-panel/localized-weather-panel';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, LocalizedWeatherPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    delete (window as any).__TOW_RUNTIME_CONFIG__;
    delete (window as any).__TOW_RUNTIME_CONFIG_OVERRIDE__;
    window.localStorage.removeItem('tow-site-language');
    window.history.replaceState({}, '', '/');
    httpTesting.verify();
  });

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(LocalizedWeatherPanel);
    fixture.detectChanges();
    await flushWeatherRequests();
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the Spanish homepage by default', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Pueblo de Wiley');
    expect(compiled.querySelector('.status')?.textContent).toContain('Sitio web oficial');
    expect(compiled.querySelector('#top-tasks h2')?.textContent).toContain(
      'Las tareas principales',
    );
    expect(compiled.querySelector('#weather-heading')?.textContent).toContain('Pronostico');
    expect(compiled.querySelector('#site-search')).toBeTruthy();
    expect(compiled.querySelector('#calendar h2')?.textContent).toContain('calendario');
    expect(compiled.querySelector('.meeting-card strong')?.textContent).toContain('concejo');
    expect(compiled.querySelector('.meeting-location')?.textContent).toContain('304 Main Street');
    expect(compiled.querySelector('.contact-link[href="tel:+17198294974"]')?.textContent).toContain(
      '(719) 829-4974',
    );
    expect(
      compiled.querySelector('.contact-link[href="mailto:deb.dillon@townofwiley.gov"]')
        ?.textContent,
    ).toContain('deb.dillon@townofwiley.gov');
    expect(
      compiled.querySelector('.contact-link[href="mailto:stephen.mckitrick@townofwiley.gov"]')
        ?.textContent,
    ).toContain('stephen.mckitrick@townofwiley.gov');
    expect(compiled.querySelector('.leadership-card h3')?.textContent).toContain(
      'Alcalde y concejo',
    );
    expect(compiled.querySelector('#accessibility h2')?.textContent).toContain('ADA y WCAG 2.1 AA');
  });

  it('should switch the homepage language back to English', async () => {
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
    expect(compiled.querySelector('.footer-links')?.textContent).toContain(
      'Accessibility statement',
    );
  });

  it('should render homepage content from Amplify Studio CMS when AppSync runtime config is present', async () => {
    (window as any).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
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
              id: 'water-outage',
              title: 'Water outage on Main Street',
              date: '2026-03-22',
              detail: 'Crews will repair a broken main from 10 PM until approximately 2 AM.',
              priority: 1,
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
    expect(compiled.querySelector('.site-alert-title')?.textContent).toContain(
      'Main Street cerrada',
    );
    expect(compiled.querySelector('.notice-card strong')?.textContent).toContain('Corte de agua');
    expect(compiled.querySelector('.contact-card strong')?.textContent).toContain('Deb Dillon');
  });

  it('should use the configured weather proxy when available', async () => {
    (window as any).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
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
    (window as any).__TOW_RUNTIME_CONFIG__ = {
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
      updateAlertSignupLanguage: (value: string) => void;
    };

    expect(component.isAlertSignupEnabled()).toBe(true);
    expect(component.alertSignupSubmitLabel()).toBe('Suscribirse a alertas');
    expect(component.alertSignupLanguageLabel()).toBe('English');
    expect(
      (
        (fixture.nativeElement as HTMLElement).querySelector(
          '#weather-alert-signup-channel',
        ) as HTMLSelectElement
      ).value,
    ).toBe('sms');

    component.updateAlertSignupLanguage('es');
    fixture.detectChanges();

    expect(component.alertSignupLanguageLabel()).toBe('Espanol');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Idioma de la alerta');
  });

  it('should render the clerk editor on the admin path', async () => {
    window.history.pushState({}, '', '/admin');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-title')?.textContent).toContain(
      'Amplify Studio es el unico CMS',
    );
    expect(compiled.textContent).toContain('La edicion local en el navegador fue deshabilitada');
    expect(compiled.querySelector('.cms-button.primary')?.textContent).toContain(
      'Abrir Amplify Console',
    );
  });

  it('should fall back to the public NWS feed when the configured proxy fails', async () => {
    (window as any).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
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

  async function flushWeatherRequests(): Promise<void> {
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
      features: [],
    });

    await Promise.resolve();
  }

  async function waitForRequest(url: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const matches = httpTesting.match(url);

      if (matches.length) {
        return matches[0];
      }

      await Promise.resolve();
    }

    throw new Error(`Timed out waiting for request: ${url}`);
  }
});
