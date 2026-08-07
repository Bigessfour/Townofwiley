import { describe, expect, it } from 'vitest';
import {
  createGoogleCalendarLinkForEvent,
  createGoogleCalendarLinkForSeed,
  createIcsDataUrlForEvent,
  createIcsDataUrlForSeed,
  createUtcTimestamp,
  escapeIcsText,
  formatGoogleCalendarDate,
  formatUtcIcsDate,
  type CalendarSeedLinkFields,
} from './calendar-public-links';
import type { CmsCalendarEvent } from './site-cms-content';

const SEED: CalendarSeedLinkFields = {
  title: 'City Council',
  detail: 'Monthly meeting',
  location: 'Town Hall',
  agendaNote: 'Public comment',
  startLocal: '20260810T180000',
  endLocal: '20260810T200000',
  recurrenceRule: 'FREQ=MONTHLY;BYDAY=2MO',
  slug: 'city-council',
};

const EVENT: CmsCalendarEvent = {
  id: 'cms-evt-1',
  title: 'Special Session',
  description: 'Budget hearing',
  location: '304 Main Street',
  start: '2026-08-10T18:00:00.000Z',
  end: '2026-08-10T20:00:00.000Z',
};

describe('calendar-public-links', () => {
  it('formats Google and ICS UTC timestamps', () => {
    const date = new Date('2026-08-10T18:00:00.000Z');
    expect(formatGoogleCalendarDate(date)).toBe('20260810T180000Z');
    expect(formatUtcIcsDate(date)).toBe('20260810T180000Z');
    expect(createUtcTimestamp()).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it('escapes ICS special characters', () => {
    expect(escapeIcsText('a;b,c\nd\\e')).toBe('a\\;b\\,c\\nd\\\\e');
  });

  it('builds seed Google Calendar and ICS links with recurrence', () => {
    const google = createGoogleCalendarLinkForSeed(SEED);
    expect(google).toContain('dates=20260810T180000%2F20260810T200000');
    expect(google).toContain('recur=RRULE%3AFREQ%3DMONTHLY%3BBYDAY%3D2MO');

    const ics = decodeURIComponent(
      createIcsDataUrlForSeed(SEED).replace('data:text/calendar;charset=utf-8,', ''),
    );
    expect(ics).toContain('UID:city-council@townofwiley.gov');
    expect(ics).toContain('RRULE:FREQ=MONTHLY;BYDAY=2MO');
  });

  it('builds CMS event Google Calendar and ICS links', () => {
    const end = new Date('2026-08-10T20:00:00.000Z');
    const google = createGoogleCalendarLinkForEvent(EVENT, end, 'Fallback detail', 'Town Hall');
    expect(google).toContain('text=Special+Session');
    expect(google).toContain('20260810T180000Z%2F20260810T200000Z');

    const ics = decodeURIComponent(
      createIcsDataUrlForEvent(EVENT, end, 'Fallback detail', 'Town Hall').replace(
        'data:text/calendar;charset=utf-8,',
        '',
      ),
    );
    expect(ics).toContain('UID:cms-evt-1@townofwiley.gov');
    expect(ics).toContain('SUMMARY:Special Session');
  });
});
