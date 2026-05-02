import type { CmsCalendarEvent } from './site-cms-content';

/** Minimal seed shape for Google Calendar / ICS URLs (matches app calendar seeds). */
export interface CalendarSeedLinkFields {
  title: string;
  detail: string;
  location: string;
  agendaNote?: string;
  startLocal: string;
  endLocal: string;
  recurrenceRule?: string;
  slug: string;
}

export function formatGoogleCalendarDate(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function formatUtcIcsDate(value: Date): string {
  return value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function createUtcTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function createGoogleCalendarLinkForSeed(seed: CalendarSeedLinkFields): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: seed.title,
    dates: `${seed.startLocal}/${seed.endLocal}`,
    details: [seed.detail, seed.agendaNote].filter(Boolean).join(' '),
    location: seed.location,
    ctz: 'America/Denver',
  });

  if (seed.recurrenceRule) {
    params.set('recur', `RRULE:${seed.recurrenceRule}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsDataUrlForSeed(seed: CalendarSeedLinkFields): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Town of Wiley//Public Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${seed.slug}@townofwiley.gov`,
    `DTSTAMP:${createUtcTimestamp()}`,
    `SUMMARY:${escapeIcsText(seed.title)}`,
    `DTSTART;TZID=America/Denver:${seed.startLocal}`,
    `DTEND;TZID=America/Denver:${seed.endLocal}`,
    `LOCATION:${escapeIcsText(seed.location)}`,
    `DESCRIPTION:${escapeIcsText([seed.detail, seed.agendaNote].filter(Boolean).join(' '))}`,
    seed.recurrenceRule ? `RRULE:${seed.recurrenceRule}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

export function createGoogleCalendarLinkForEvent(
  event: CmsCalendarEvent,
  end: Date,
  fallbackDetail: string,
  fallbackLocation: string,
): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleCalendarDate(new Date(event.start))}/${formatGoogleCalendarDate(end)}`,
    details: event.description || fallbackDetail,
    location: event.location || fallbackLocation,
    ctz: 'America/Denver',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsDataUrlForEvent(
  event: CmsCalendarEvent,
  end: Date,
  fallbackDetail: string,
  fallbackLocation: string,
): string {
  const start = new Date(event.start);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Town of Wiley//Public Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@townofwiley.gov`,
    `DTSTAMP:${createUtcTimestamp()}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DTSTART:${formatUtcIcsDate(start)}`,
    `DTEND:${formatUtcIcsDate(end)}`,
    `LOCATION:${escapeIcsText(event.location || fallbackLocation)}`,
    `DESCRIPTION:${escapeIcsText(event.description || fallbackDetail)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}
