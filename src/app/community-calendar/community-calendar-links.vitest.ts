import { describe, expect, it } from 'vitest';
import {
  createGoogleCalendarLinkForCommunityEvent,
  createIcsDataUrlForCommunityEvent,
} from './community-calendar-links';
import type { CommunityEvent } from './community-calendar.types';

const EVENT: CommunityEvent = {
  eventId: 'evt-link-1',
  title: 'Yard Sale; Neighborhood',
  description: 'Bring cash,\ncash only',
  category: 'yard_sale',
  location: '100 Main Street, Wiley CO',
  startDateTime: '2099-08-01T16:00:00.000Z',
  endDateTime: '2099-08-01T20:00:00.000Z',
};

describe('community-calendar-links', () => {
  it('builds a Google Calendar template URL with Denver timezone', () => {
    const url = createGoogleCalendarLinkForCommunityEvent(EVENT);
    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Yard+Sale%3B+Neighborhood');
    expect(url).toContain('ctz=America%2FDenver');
  });

  it('builds an ICS data URL with escaped text and event UID', () => {
    const dataUrl = createIcsDataUrlForCommunityEvent(EVENT);
    expect(dataUrl.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
    const decoded = decodeURIComponent(dataUrl.replace('data:text/calendar;charset=utf-8,', ''));
    expect(decoded).toContain('UID:evt-link-1@townofwiley.gov');
    expect(decoded).toContain('SUMMARY:Yard Sale\\; Neighborhood');
    expect(decoded).toContain('DESCRIPTION:Bring cash\\,\\ncash only');
    expect(decoded).toContain('END:VCALENDAR');
  });
});
