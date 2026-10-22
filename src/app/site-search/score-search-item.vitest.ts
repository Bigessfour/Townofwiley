import { describe, expect, it } from 'vitest';
import type { SearchItem } from '../app-copy';
import { scoreSearchItem } from './score-search-item';

const baseItem = (overrides: Partial<SearchItem> = {}): SearchItem => ({
  title: 'City Council Meeting',
  summary: 'Monthly council agenda and minutes',
  category: 'Meetings',
  href: '/meetings',
  keywords: ['agenda', 'council'],
  ...overrides,
});

describe('scoreSearchItem', () => {
  it('returns 0 when a query term is missing from the haystack', () => {
    expect(scoreSearchItem(baseItem(), ['zoning'], 'zoning')).toBe(0);
  });

  it('boosts meeting-intent queries for /meetings rows', () => {
    const withIntent = scoreSearchItem(baseItem(), ['meeting'], 'meeting');
    const withoutIntent = scoreSearchItem(
      baseItem({ title: 'Utility payment', summary: 'Pay your bill', keywords: ['payment'] }),
      ['payment'],
      'payment',
    );

    expect(withIntent).toBeGreaterThan(withoutIntent);
  });

  it('boosts clerk contact mailto rows for clerk terms', () => {
    const score = scoreSearchItem(
      baseItem({
        title: 'Clerk: Deb Dillon',
        summary: 'City clerk contact',
        category: 'Contact',
        href: 'mailto:clerk@example.com',
        keywords: ['clerk'],
      }),
      ['clerk'],
      'clerk',
    );

    expect(score).toBeGreaterThan(40);
  });
});
