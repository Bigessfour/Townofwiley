import { describe, expect, it } from 'vitest';
import { resolveSiteRouteChrome } from './site-route-chrome';

describe('resolveSiteRouteChrome', () => {
  it('marks weather as a feature page and skips weather priming', () => {
    const chrome = resolveSiteRouteChrome('/weather');
    expect(chrome.isWeatherMode).toBe(true);
    expect(chrome.isFeaturePageMode).toBe(true);
    expect(chrome.shouldPrimeWeatherAlerts).toBe(false);
    expect(chrome.isNotFoundMode).toBe(false);
  });

  it('treats /notices like the news hub for chrome', () => {
    const chrome = resolveSiteRouteChrome('/notices');
    expect(chrome.isNewsMode).toBe(true);
    expect(chrome.isFeaturePageMode).toBe(true);
  });

  it('flags unknown public paths as not-found', () => {
    const chrome = resolveSiteRouteChrome('/totally-unknown-town-path');
    expect(chrome.isNotFoundMode).toBe(true);
    expect(chrome.isFeaturePageMode).toBe(false);
  });

  it('keeps admin shell out of not-found mode', () => {
    const chrome = resolveSiteRouteChrome('/admin');
    expect(chrome.isAdminMode).toBe(true);
    expect(chrome.isTopLevelLazyRouteMode).toBe(true);
    expect(chrome.isNotFoundMode).toBe(false);
  });
});
