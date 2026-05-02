import { describe, expect, it } from 'vitest';
import type { CmsCalendarEvent } from '../site-cms-content';
import {
  buildCalendarItems,
  buildMeetingItems,
  formatCalendarEventDate,
  parseCalendarSeedDate,
  resolveCalendarEventEnd,
  type CalendarSeed,
  type CalendarViewCopy,
  type MeetingsCopy,
} from './meetings-page.helpers';

const MEETINGS_COPY: MeetingsCopy = {
  calendarCopy: 'View the latest town meetings, agendas, and community events for Wiley.',
  calendarEventFallbackLocation: 'Wiley Town Hall, 304 Main Street',
};

const CALENDAR_COPY: CalendarViewCopy = {
  calendarPublishedEventCategory: 'Upcoming event',
  calendarEventFallbackDetail: 'Default calendar detail',
  calendarEventFallbackLocation: 'Wiley Town Hall, 304 Main Street',
  calendarScheduledEventLabel: 'Recurring monthly',
};

const FALLBACK_SEEDS: CalendarSeed[] = [
  {
    title: 'City Council Regular Meeting',
    dateLabel: 'Every 2nd Monday, 6:00 PM',
    category: 'City Council',
    detail: 'The canonical event record for the monthly meeting.',
    location: 'Wiley Town Hall, 304 Main Street',
    recurrence: 'Recurring monthly',
    agendaNote: 'Agenda note',
    startLocal: '20260413T180000',
    endLocal: '20260413T190000',
    slug: 'city-council-regular-meeting',
    extraActions: [{ label: 'Call Town Hall', href: 'tel:+17198294974' }],
  },
];

const FALLBACK_MEETINGS = [
  {
    title: 'Town meeting fallback',
    schedule: 'Fallback schedule',
    format: 'Fallback format',
    location: 'Fallback location',
  },
];

const LIVE_EVENTS: CmsCalendarEvent[] = [
  {
    id: 'event-1',
    title: 'City Council Regular Meeting',
    description: 'Monthly council meeting with published agenda packages.',
    location: 'Wiley Town Hall, 304 Main Street',
    start: '2026-04-13T18:00:00.000Z',
    end: '2026-04-13T19:00:00.000Z',
  },
];

describe('meetings page helpers', () => {
  it('maps live events into meeting and calendar view models', () => {
    const meetingItems = buildMeetingItems(LIVE_EVENTS, [], MEETINGS_COPY, 'en-US');
    const calendarItems = buildCalendarItems(LIVE_EVENTS, [], CALENDAR_COPY, 'en-US');

    expect(meetingItems).toHaveLength(1);
    expect(meetingItems[0]).toMatchObject({
      title: 'City Council Regular Meeting',
      format: 'Monthly council meeting with published agenda packages.',
      location: 'Wiley Town Hall, 304 Main Street',
    });
    expect(meetingItems[0].schedule).toContain('Apr');

    expect(calendarItems).toHaveLength(1);
    expect(calendarItems[0]).toMatchObject({
      id: 'event-1',
      title: 'City Council Regular Meeting',
      category: 'Upcoming event',
      detail: 'Monthly council meeting with published agenda packages.',
      location: 'Wiley Town Hall, 304 Main Street',
      recurrence: 'Recurring monthly',
      actions: [],
    });
    expect(calendarItems[0].startDate).toBeInstanceOf(Date);
    expect(calendarItems[0].endDate).toBeInstanceOf(Date);
  });

  it('falls back to seed data when live events are unavailable', () => {
    const meetingItems = buildMeetingItems([], FALLBACK_MEETINGS, MEETINGS_COPY, 'en-US');
    const calendarItems = buildCalendarItems([], FALLBACK_SEEDS, CALENDAR_COPY, 'en-US');

    expect(meetingItems).toEqual(FALLBACK_MEETINGS);
    expect(calendarItems).toHaveLength(1);
    expect(calendarItems[0]).toMatchObject({
      id: 'seed-city-council-regular-meeting-0',
      title: 'City Council Regular Meeting',
      date: 'Every 2nd Monday, 6:00 PM',
      category: 'Upcoming event',
      detail: 'The canonical event record for the monthly meeting.',
      location: 'Wiley Town Hall, 304 Main Street',
      recurrence: 'Recurring monthly',
      agendaNote: 'Agenda note',
      actions: [{ label: 'Call Town Hall', href: 'tel:+17198294974' }],
    });
    expect(calendarItems[0].startDate).toEqual(new Date(2026, 3, 13, 18, 0, 0));
    expect(calendarItems[0].endDate).toEqual(new Date(2026, 3, 13, 19, 0, 0));
  });

  it('parses seed dates and formats event ranges deterministically', () => {
    expect(parseCalendarSeedDate('20260413T180000')).toEqual(new Date(2026, 3, 13, 18, 0, 0));
    expect(parseCalendarSeedDate('not-a-seed-date')).toEqual(new Date(0));

    const start = new Date(2026, 3, 13, 18, 0, 0);
    const sameEnd = new Date(2026, 3, 13, 18, 0, 0);
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    expect(formatCalendarEventDate(start, sameEnd, 'en-US')).toBe(formatter.format(start));
    expect(
      resolveCalendarEventEnd({
        id: 'event-2',
        title: 'Fallback end',
        description: '',
        location: '',
        start: '2026-04-13T18:00:00.000Z',
        end: null,
      }),
    ).toBeInstanceOf(Date);
  });
});
