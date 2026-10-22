import type { AppCopy, MeetingItem } from '../app-copy';
import {
  buildMeetingItems,
  type MeetingsCopy,
} from '../meetings-page/meetings-page.helpers';
import type { LinkedAgendaDocument } from '../public-document-event-link';
import type { CmsCalendarEvent } from '../site-cms-content';

function toMeetingsCopy(copy: AppCopy): MeetingsCopy {
  return {
    calendarCopy: copy.calendarCopy,
    calendarEventFallbackLocation: copy.calendarEventFallbackLocation,
    agendaPdfButtonLabel: copy.meetingsAgendaPdfButtonLabel,
    meetingsAgendaLinkedButtonLabel: copy.meetingsAgendaLinkedButtonLabel,
    documentsHubButtonLabel: copy.meetingsDocumentsHubButtonLabel,
  };
}

/**
 * Homepage meetings preview: live CMS events when present, else seed rows from APP_COPY.
 * Seed rows for the notices shortcut omit navigation when the homepage already shows enough notices.
 */
export function buildHomepageMeetings(
  liveEvents: CmsCalendarEvent[],
  seedMeetings: MeetingItem[],
  copy: AppCopy,
  locale: string,
  linkedAgendaByEventId: Record<string, LinkedAgendaDocument>,
  hasExtraNotices: boolean,
): MeetingItem[] {
  const meetingsCopy = toMeetingsCopy(copy);

  if (liveEvents.length) {
    return buildMeetingItems(liveEvents, [], meetingsCopy, locale, linkedAgendaByEventId);
  }

  return seedMeetings.map((meeting) => {
    const agendaPdfHref = meeting.agendaPdfHref ?? '/meetings';
    const agendaButtonLabel =
      meeting.href === '/news' ? copy.meetingsDocumentsHubButtonLabel : undefined;

    if (meeting.href === '/news' && !hasExtraNotices) {
      return {
        title: meeting.title,
        schedule: meeting.schedule,
        format: meeting.format,
        location: meeting.location,
        agendaNote: meeting.agendaNote,
        agendaPdfHref,
        agendaButtonLabel,
      };
    }

    return { ...meeting, agendaPdfHref, agendaButtonLabel };
  });
}
