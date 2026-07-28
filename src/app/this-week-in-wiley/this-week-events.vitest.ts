import { describe, expect, it } from 'vitest';
import { selectThisWeekOrUpcoming, type ThisWeekEventItem } from './this-week-events';

describe('selectThisWeekOrUpcoming', () => {
  const now = Date.parse('2026-07-28T18:00:00.000Z');

  it('prefers events within the next 7 days', () => {
    const items: ThisWeekEventItem[] = [
      {
        id: 'a',
        title: 'Soon',
        startDateTime: '2026-07-30T16:00:00.000Z',
        source: 'community',
        href: '/meetings#community',
      },
      {
        id: 'b',
        title: 'Later',
        startDateTime: '2026-09-19T14:00:00.000Z',
        endDateTime: '2026-09-19T22:00:00.000Z',
        source: 'community',
        href: '/meetings#community',
      },
    ];
    const result = selectThisWeekOrUpcoming(items, now);
    expect(result.mode).toBe('thisWeek');
    expect(result.events.map((e) => e.id)).toEqual(['a']);
  });

  it('falls back to coming up when nothing is this week', () => {
    const items: ThisWeekEventItem[] = [
      {
        id: 'sale',
        title: 'Community-wide yard sale day',
        startDateTime: '2026-09-19T14:00:00.000Z',
        endDateTime: '2026-09-19T22:00:00.000Z',
        source: 'community',
        href: '/meetings#community',
      },
    ];
    const result = selectThisWeekOrUpcoming(items, now);
    expect(result.mode).toBe('comingUp');
    expect(result.events[0]?.title).toMatch(/yard sale/i);
  });
});
