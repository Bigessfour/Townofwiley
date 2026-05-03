import { describe, expect, it } from 'vitest';
import { getAppRouteLink, isPathRegisteredAppRoute, normalizeAppRoutePath } from './internal-route-link';

describe('normalizeAppRoutePath', () => {
  it('strips query strings and trailing slashes', () => {
    expect(normalizeAppRoutePath('/services?ref=1')).toBe('/services');
    expect(normalizeAppRoutePath('/meetings/')).toBe('/meetings');
    expect(normalizeAppRoutePath('/')).toBe('/');
    expect(normalizeAppRoutePath('///')).toBe('/');
  });
});

describe('isPathRegisteredAppRoute', () => {
  it('recognizes known routes after normalization', () => {
    expect(isPathRegisteredAppRoute('/weather')).toBe(true);
    expect(isPathRegisteredAppRoute('/weather/')).toBe(true);
    expect(isPathRegisteredAppRoute('/services?x=y')).toBe(true);
    expect(isPathRegisteredAppRoute('/not-a-real-town-route-xyz')).toBe(false);
  });
});

describe('getAppRouteLink', () => {
  it('treats /pay-bill, /payments, and /permits as internal app routes', () => {
    expect(getAppRouteLink('/pay-bill')).toEqual({
      href: '/pay-bill',
      isInternal: true,
      path: '/pay-bill',
      fragment: undefined,
    });
    expect(getAppRouteLink('/payments')).toEqual({
      href: '/payments',
      isInternal: true,
      path: '/payments',
      fragment: undefined,
    });
    expect(getAppRouteLink('/permits#top')).toEqual({
      href: '/permits#top',
      isInternal: true,
      path: '/permits',
      fragment: 'top',
    });
  });

  it('treats query-only differences on internal paths as internal', () => {
    expect(getAppRouteLink('/services?ref=cms#payment-help')).toEqual({
      href: '/services?ref=cms#payment-help',
      isInternal: true,
      path: '/services',
      fragment: 'payment-help',
    });
  });

  it('treats trailing slash paths as internal', () => {
    expect(getAppRouteLink('/meetings/')).toEqual({
      href: '/meetings/',
      isInternal: true,
      path: '/meetings',
      fragment: undefined,
    });
  });

  it('preserves hash fragment on internal default path', () => {
    expect(getAppRouteLink('#records-request', '/services')).toEqual({
      href: '#records-request',
      isInternal: true,
      path: '/services',
      fragment: 'records-request',
    });
  });

  it('normalizes default path for hash-only href', () => {
    expect(getAppRouteLink('#issue-report', '/services?from=email')).toEqual({
      href: '#issue-report',
      isInternal: true,
      path: '/services',
      fragment: 'issue-report',
    });
  });

  it('marks absolute URLs as external', () => {
    expect(getAppRouteLink('https://example.com/doc')).toEqual({
      href: 'https://example.com/doc',
      isInternal: false,
      path: null,
    });
  });

  it('marks unknown app-shaped paths as external', () => {
    expect(getAppRouteLink('/totally-unknown-path')).toEqual({
      href: '/totally-unknown-path',
      isInternal: false,
      path: null,
    });
  });

  it('returns empty non-link for blank href', () => {
    expect(getAppRouteLink('   ')).toEqual({
      href: '',
      isInternal: false,
      path: null,
    });
  });
});
