import {
  createGoogleCalendarLinkForEvent,
  createGoogleCalendarLinkForSeed,
  createIcsDataUrlForEvent,
  createIcsDataUrlForSeed,
} from '../calendar-public-links';
import { DOCUMENT_HUB_LINKS } from '../document-hub/document-links';
import type { CmsCalendarEvent } from '../site-cms-content';

export interface MeetingItem {
  title: string;
  schedule: string;
  format: string;
  location?: string;
  agendaNote?: string;
  cta?: string;
  href?: string;
  agendaPdfHref?: string;
  /** When set, overrides default agenda PDF button label (e.g. notices shortcut row). */
  agendaButtonLabel?: string;
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
  recurrenceRule?: string;
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
  agendaPdfButtonLabel: string;
  documentsHubButtonLabel: string;
}

export interface CalendarViewCopy {
  calendarPublishedEventCategory: string;
  calendarEventFallbackDetail: string;
  calendarEventFallbackLocation: string;
  calendarScheduledEventLabel: string;
  calendarGoogleActionLabel: string;
  calendarDownloadActionLabel: string;
  calendarAgendaActionLabel: string;
}

const DEFAULT_AGENDA_HREF = DOCUMENT_HUB_LINKS.meetings;

export function buildMeetingItems(
  liveEvents: CmsCalendarEvent[],
  fallbackMeetings: MeetingItem[],
  copy: MeetingsCopy,
  locale: string,
): MeetingItem[] {
  if (liveEvents.length > 0) {
    return liveEvents.map((event) => createMeetingItemFromEvent(event, copy, locale));
  }

  return fallbackMeetings.map((row) => {
    const agendaPdfHref = row.agendaPdfHref ?? DEFAULT_AGENDA_HREF;
    const agendaButtonLabel =
      row.href === '/notices' ? copy.documentsHubButtonLabel : copy.agendaPdfButtonLabel;

    return {
      ...row,
      agendaPdfHref,
      agendaButtonLabel,
    };
  });
}

export function buildCalendarItems(
  liveEvents: CmsCalendarEvent[],
  fallbackSeeds: CalendarSeed[],
  copy: CalendarViewCopy,
  locale: string,
): CalendarItem[] {
  return liveEvents.length > 0
    ? liveEvents.map((event) => createCalendarItemFromEvent(event, copy, locale))
    : fallbackSeeds.map((seed, index) => createCalendarItemFromSeed(seed, index, copy));
}

function createCalendarItemFromSeed(
  seed: CalendarSeed,
  index: number,
  copy: CalendarViewCopy,
): CalendarItem {
  const linkSeed = {
    title: seed.title,
    detail: seed.detail,
    location: seed.location,
    agendaNote: seed.agendaNote,
    startLocal: seed.startLocal,
    endLocal: seed.endLocal,
    recurrenceRule: seed.recurrenceRule,
    slug: seed.slug,
  };

  return {
    id: `seed-${seed.slug}-${index}`,
    title: seed.title,
    date: seed.dateLabel,
    category: copy.calendarPublishedEventCategory,
    detail: seed.detail,
    location: seed.location,
    recurrence: seed.recurrence,
    agendaNote: seed.agendaNote,
    actions: [
      {
        label: copy.calendarGoogleActionLabel,
        href: createGoogleCalendarLinkForSeed(linkSeed),
        external: true,
      },
      {
        label: copy.calendarDownloadActionLabel,
        href: createIcsDataUrlForSeed(linkSeed),
        downloadFileName: `${seed.slug}.ics`,
      },
      {
        label: copy.calendarAgendaActionLabel,
        href: DOCUMENT_HUB_LINKS.meetings,
      },
      ...(seed.extraActions ?? []),
    ],
    startDate: parseCalendarSeedDate(seed.startLocal),
    endDate: parseCalendarSeedDate(seed.endLocal),
  };
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
    agendaPdfHref: DEFAULT_AGENDA_HREF,
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
    actions: [
      {
        label: copy.calendarGoogleActionLabel,
        href: createGoogleCalendarLinkForEvent(
          event,
          end,
          copy.calendarEventFallbackDetail,
          copy.calendarEventFallbackLocation,
        ),
        external: true,
      },
      {
        label: copy.calendarDownloadActionLabel,
        href: createIcsDataUrlForEvent(
          event,
          end,
          copy.calendarEventFallbackDetail,
          copy.calendarEventFallbackLocation,
        ),
        downloadFileName: `${event.id}.ics`,
      },
      {
        label: copy.calendarAgendaActionLabel,
        href: DOCUMENT_HUB_LINKS.meetings,
      },
    ],
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
