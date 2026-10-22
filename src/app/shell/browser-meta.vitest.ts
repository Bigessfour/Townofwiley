import { describe, expect, it } from 'vitest';
import {
  buildBrowserDescription,
  buildBrowserTitle,
  truncateMetaDescription,
} from './browser-meta';

describe('browser-meta helpers', () => {
  it('truncates long meta descriptions with an ellipsis', () => {
    const long = 'a'.repeat(200);
    const truncated = truncateMetaDescription(long, 20);
    expect(truncated.length).toBe(20);
    expect(truncated.endsWith('...')).toBe(true);
  });

  it('builds not-found browser titles', () => {
    expect(
      buildBrowserTitle({
        siteTitle: 'Town of Wiley',
        featureTitle: null,
        isNotFound: true,
        notFoundBrowserTitle: 'Page not found',
      }),
    ).toBe('Page not found | Town of Wiley');
  });

  it('prefers feature title when distinct from the site title', () => {
    expect(
      buildBrowserTitle({
        siteTitle: 'Town of Wiley',
        featureTitle: 'Meetings',
        isNotFound: false,
        notFoundBrowserTitle: 'Page not found',
      }),
    ).toBe('Meetings | Town of Wiley');
  });

  it('falls back to site meta description without a feature page', () => {
    expect(
      buildBrowserDescription({
        isNotFound: false,
        notFoundMetaDescription: 'missing',
        siteMetaDescription: 'Official Town of Wiley website',
        featureTitle: null,
        featureSummary: null,
      }),
    ).toBe('Official Town of Wiley website');
  });
});
