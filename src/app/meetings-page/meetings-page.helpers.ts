import type { CmsCalendarEvent } from '../site-cms-content';

export interface MeetingItem {
  title: string;
  schedule: string;
  format: string;
  location?: string;
  agendaNote?: string;
  cta?: string;
  href?: string;
}

export interface CalendarAction {
  label: string;
  href: string;
  downloadFileName?: string;
  external?: boolean;
}

export interface CalendarSeed {
  title: string;
  dateLabel: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  startLocal: string;
  endLocal: string;
  extraActions?: CalendarAction[];
  slug: string;
}

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  category: string;
  detail: string;
  location: string;
  recurrence: string;
  agendaNote?: string;
  actions: CalendarAction[];
  startDate: Date;
  endDate: Date;
}

export interface MeetingsCopy {
  calendarCopy: string;
  calendarEventFallbackLocation: string;
}

export interface CalendarViewCopy {
  calendarPublishedEventCategory: string;
  calendarEventFallbackDetail: string;
  calendarEventFallbackLocation: string;
  calendarScheduledEventLabel: string;
}

export function buildMeetingItems(
  liveEvents: CmsCalendarEvent[],
  fallbackMeetings: MeetingItem[],
  copy: MeetingsCopy,
  locale: string,
): MeetingItem[] {
  return liveEvents.length > 0
    ? liveEvents.map((event) => createMeetingItemFromEvent(event, copy, locale))
    : fallbackMeetings;
}

export function buildCalendarItems(
  liveEvents: CmsCalendarEvent[],
  fallbackSeeds: CalendarSeed[],
  copy: CalendarViewCopy,
  locale: string,
): CalendarItem[] {
  return liveEvents.length > 0
    ? liveEvents.map((event) => createCalendarItemFromEvent(event, copy, locale))
    : fallbackSeeds.map((seed, index) => ({
        id: `seed-${seed.slug}-${index}`,
        title: seed.title,
        date: seed.dateLabel,
        category: copy.calendarPublishedEventCategory,
        detail: seed.detail,
        location: seed.location,
        recurrence: seed.recurrence,
        agendaNote: seed.agendaNote,
        actions: seed.extraActions ?? [],
        startDate: parseCalendarSeedDate(seed.startLocal),
        endDate: parseCalendarSeedDate(seed.endLocal),
      }));
}

export function createMeetingItemFromEvent(
  event: CmsCalendarEvent,
  copy: MeetingsCopy,
  locale: string,
): MeetingItem {
  const start = new Date(event.start);
  const end = resolveCalendarEventEnd(event);

  return {
    title: event.title,
    schedule: formatCalendarEventDate(start, end, locale),
    format: event.description || copy.calendarCopy,
    location: event.location || copy.calendarEventFallbackLocation,
  };
}

export function createCalendarItemFromEvent(
  event: CmsCalendarEvent,
  copy: CalendarViewCopy,
  locale: string,
): CalendarItem {
  const start = new Date(event.start);
  const end = resolveCalendarEventEnd(event);

  return {
    id: event.id,
    title: event.title,
    date: formatCalendarEventDate(start, end, locale),
    category: copy.calendarPublishedEventCategory,
    detail: event.description || copy.calendarEventFallbackDetail,
    location: event.location || copy.calendarEventFallbackLocation,
    recurrence: copy.calendarScheduledEventLabel,
    actions: [],
    startDate: start,
    endDate: end,
  };
}

export function resolveCalendarEventEnd(event: CmsCalendarEvent): Date {
  if (event.end) {
    const explicitEnd = new Date(event.end);

    if (!Number.isNaN(explicitEnd.getTime())) {
      return explicitEnd;
    }
  }

  const defaultEnd = new Date(event.start);
  defaultEnd.setHours(defaultEnd.getHours() + 1);

  return defaultEnd;
}

export function parseCalendarSeedDate(value: string): Date {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(value);

  if (!match) {
    return new Date(0);
  }

  const [, year, month, day, hour, minute, second] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

export function formatCalendarEventDate(start: Date, end: Date, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const startLabel = formatter.format(start);
  const endLabel = formatter.format(end);

  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}
