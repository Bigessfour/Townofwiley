import { describe, expect, it } from 'vitest';
import type { AppCopy } from './app';
import {
  applyAppCopySiteCopyOverrides,
  resolveSiteCopyLabel,
  siteCopyKeyForNavHref,
  siteCopyTelHref,
} from './site-copy-overrides';

describe('site-copy-overrides', () => {
  it('resolves Spanish when present', () => {
    const lookup = (key: string) =>
      key === 'contactKicker' ? { en: 'Contact', es: 'Contacto CMS' } : undefined;
    expect(resolveSiteCopyLabel(lookup, 'es', 'contactKicker', 'Fallback')).toBe('Contacto CMS');
    expect(resolveSiteCopyLabel(lookup, 'en', 'contactKicker', 'Fallback')).toBe('Contact');
  });

  it('maps nav hrefs to stable keys', () => {
    expect(siteCopyKeyForNavHref('/meetings')).toBe('nav.meetings');
    expect(siteCopyKeyForNavHref('#top-tasks')).toBe('nav.topTasks');
  });

  it('overrides menu labels and nav link labels on APP_COPY', () => {
    const base = {
      menuQuickTasksLabel: 'I Want To...',
      navLinks: [{ label: 'News', href: '/news', icon: 'pi pi-newspaper' }],
    } as AppCopy;
    const lookup = (key: string) => {
      if (key === 'menuQuickTasksLabel') {
        return { en: 'Quick links' };
      }
      if (key === 'nav.news') {
        return { en: 'Town news' };
      }
      return undefined;
    };
    const merged = applyAppCopySiteCopyOverrides(base, lookup, 'en');
    expect(merged.menuQuickTasksLabel).toBe('Quick links');
    expect(merged.navLinks[0]?.label).toBe('Town news');
  });

  it('builds tel href from display phone', () => {
    expect(siteCopyTelHref('(719) 829-4974', '')).toBe('tel:+17198294974');
  });
});