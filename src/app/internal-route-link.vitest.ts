import { describe, expect, it } from 'vitest';
import { getAppRouteLink } from './internal-route-link';

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

  it('preserves hash fragment on internal default path', () => {
    expect(getAppRouteLink('#records-request', '/services')).toEqual({
      href: '#records-request',
      isInternal: true,
      path: '/services',
      fragment: 'records-request',
    });
  });

  it('marks absolute URLs as external', () => {
    expect(getAppRouteLink('https://example.com/doc')).toEqual({
      href: 'https://example.com/doc',
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
