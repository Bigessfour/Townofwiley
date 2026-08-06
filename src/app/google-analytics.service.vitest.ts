import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GA4_MEASUREMENT_ID, GoogleAnalyticsService } from './google-analytics.service';

function createHarness(overrides: Record<string, unknown> = {}): GoogleAnalyticsService {
  const service = Object.create(GoogleAnalyticsService.prototype) as GoogleAnalyticsService;
  Object.assign(service, {
    platformId: 'browser',
    title: { getTitle: vi.fn(() => 'Contact Town Hall | Town of Wiley') },
    lastReportedPath: null,
    normalizeAppUrl: GoogleAnalyticsService.prototype['normalizeAppUrl'],
    ...overrides,
  });
  return service;
}

describe('GoogleAnalyticsService', () => {
  const gtag = vi.fn();

  beforeEach(() => {
    gtag.mockReset();
    Object.defineProperty(window, 'gtag', { configurable: true, writable: true, value: gtag });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'https://townofwiley.gov/contact',
        pathname: '/contact',
        search: '',
        hash: '',
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports the live measurement id used by google-analytics-init.js', () => {
    expect(GA4_MEASUREMENT_ID).toBe('G-HS0707W6BF');
  });

  it('sends page_view with path, title, and location', () => {
    createHarness().sendPageView('/contact');

    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_title: 'Contact Town Hall | Town of Wiley',
      page_location: 'https://townofwiley.gov/contact',
      page_path: '/contact',
      send_to: GA4_MEASUREMENT_ID,
    });
  });

  it('does not double-send the same URL', () => {
    const service = createHarness();
    service.sendPageView('/pay-bill');
    service.sendPageView('/pay-bill');

    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('strips the fragment from page_path and does not re-send fragment-only navigations', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        href: 'https://townofwiley.gov/services#issue-report',
        pathname: '/services',
        search: '',
        hash: '#issue-report',
      },
    });

    const service = createHarness();
    service.sendPageView('/services');
    service.sendPageView('/services#issue-report');

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({
        page_path: '/services',
      }),
    );
  });

  it('no-ops when gtag is unavailable', () => {
    Object.defineProperty(window, 'gtag', { configurable: true, writable: true, value: undefined });
    expect(() => createHarness().sendPageView('/')).not.toThrow();
    expect(gtag).not.toHaveBeenCalled();
  });
});
