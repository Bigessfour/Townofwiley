import {
  createUtcTimestamp,
  escapeIcsText,
  formatGoogleCalendarDate,
  formatUtcIcsDate,
} from '../calendar-public-links';
import type { CommunityEvent } from './community-calendar.types';

export function createGoogleCalendarLinkForCommunityEvent(event: CommunityEvent): string {
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
    details: event.description,
    location: event.location,
    ctz: 'America/Denver',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsDataUrlForCommunityEvent(event: CommunityEvent): string {
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Town of Wiley//Community Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.eventId}@townofwiley.gov`,
    `DTSTAMP:${createUtcTimestamp()}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DTSTART:${formatUtcIcsDate(start)}`,
    `DTEND:${formatUtcIcsDate(end)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}
