import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { WeatherPanel } from './weather-panel/weather-panel';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, WeatherPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    delete (window as any).__TOW_RUNTIME_CONFIG__;
    delete (window as any).__TOW_RUNTIME_CONFIG_OVERRIDE__;
    window.history.replaceState({}, '', '/');
    httpTesting.verify();
  });

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(WeatherPanel);
    fixture.detectChanges();
    await flushWeatherRequests();
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should render the default homepage message', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await flushWeatherRequests();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Town of Wiley');
    expect(compiled.querySelector('.status')?.textContent).toContain('Official Town Website');
    expect(compiled.querySelector('#top-tasks h2')?.textContent).toContain('Top tasks');
    expect(compiled.querySelector('#weather-heading')?.textContent).toContain(
      'National Weather Service forecast',
    );
    expect(compiled.querySelector('#site-search')).toBeTruthy();
    expect(compiled.querySelector('#calendar h2')?.textContent).toContain('calendar app');
    expect(compiled.querySelector('.meeting-card strong')?.textContent).toContain('City Council');
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
      'Mayor and Council',
    );
    expect(compiled.querySelector('#accessibility h2')?.textContent).toContain(
      'ADA and WCAG 2.1 AA',
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
    expect(compiled.querySelector('h1')?.textContent).toContain('Wiley Community Updates');
    expect(compiled.querySelector('.site-alert-title')?.textContent).toContain(
      'Main Street closed tonight',
    );
    expect(compiled.querySelector('.notice-card strong')?.textContent).toContain(
      'Water outage on Main Street',
    );
    expect(compiled.querySelector('.contact-card strong')?.textContent).toContain('Deb Dillon');
  });

  it('should use the configured weather proxy when available', async () => {
    (window as any).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      weather: {
        apiEndpoint: '/api/weather/nws',
        allowBrowserFallback: false,
      },
    };

    const fixture = TestBed.createComponent(WeatherPanel);
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
    expect(compiled.querySelector('.weather-source')?.textContent).toContain('AWS weather service');
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

    const fixture = TestBed.createComponent(WeatherPanel);
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
    fixture.detectChanges();

    const component = fixture.componentInstance as WeatherPanel & {
      isAlertSignupEnabled: () => boolean;
      alertSignupSubmitLabel: () => string;
    };

    expect(component.isAlertSignupEnabled()).toBe(true);
    expect(component.alertSignupSubmitLabel()).toBe('Sign up for alerts');
  });

  it('should render the clerk editor on the admin path', async () => {
    window.history.pushState({}, '', '/admin');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cms-title')?.textContent).toContain(
      'Amplify Studio is the only CMS',
    );
    expect(compiled.textContent).toContain('Browser-local editing has been disabled');
    expect(compiled.querySelector('.cms-button.primary')?.textContent).toContain(
      'Open Amplify Console',
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
    expect(compiled.textContent).toContain('fell back to the public National Weather Service feed');
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
