import { describe, expect, it } from 'vitest';
import { mergeCommunityEventsWithBundled } from './community-calendar-seed';
import type { CommunityEvent } from './community-calendar.types';

describe('community-calendar-seed', () => {
  const beforeSale = Date.parse('2026-07-28T12:00:00.000Z');
  const afterSale = Date.parse('2026-09-20T12:00:00.000Z');

  it('includes the September 2026 community-wide yard sale before it ends', () => {
    const merged = mergeCommunityEventsWithBundled([], beforeSale);
    expect(merged.some((e) => e.eventId === 'tow-community-yard-sale-2026-09-19')).toBe(true);
    const sale = merged.find((e) => e.eventId === 'tow-community-yard-sale-2026-09-19');
    expect(sale?.category).toBe('yard_sale');
    expect(sale?.title).toMatch(/yard sale/i);
  });

  it('drops bundled seeds after endDateTime', () => {
    const merged = mergeCommunityEventsWithBundled([], afterSale);
    expect(merged.some((e) => e.eventId === 'tow-community-yard-sale-2026-09-19')).toBe(false);
  });

  it('lets live API rows override the same eventId', () => {
    const live: CommunityEvent[] = [
      {
        eventId: 'tow-community-yard-sale-2026-09-19',
        title: 'Updated yard sale title',
        description: 'From API',
        category: 'yard_sale',
        location: 'Wiley',
        startDateTime: '2026-09-19T14:00:00.000Z',
        endDateTime: '2026-09-19T22:00:00.000Z',
      },
    ];
    const merged = mergeCommunityEventsWithBundled(live, beforeSale);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe('Updated yard sale title');
  });
});
