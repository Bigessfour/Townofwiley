import type { CmsPublicDocument } from './site-cms-content';

/** Keyword prefix tying a PublicDocument row to an Event id in AppSync. */
export const PUBLIC_DOCUMENT_EVENT_KEYWORD_PREFIX = 'event:';

export interface LinkedAgendaDocument {
  documentId: string;
  storageHref: string;
}

export function eventDocumentKeyword(eventId: string): string {
  return `${PUBLIC_DOCUMENT_EVENT_KEYWORD_PREFIX}${eventId.trim()}`;
}

export function readLinkedEventId(keywords: readonly string[] | null | undefined): string | null {
  if (!keywords?.length) {
    return null;
  }

  for (const keyword of keywords) {
    if (typeof keyword !== 'string') {
      continue;
    }

    if (keyword.startsWith(PUBLIC_DOCUMENT_EVENT_KEYWORD_PREFIX)) {
      const eventId = keyword.slice(PUBLIC_DOCUMENT_EVENT_KEYWORD_PREFIX.length).trim();
      if (eventId) {
        return eventId;
      }
    }
  }

  return null;
}

export function cmsDocumentHubFragment(documentId: string): string {
  return `cms-doc-${documentId.trim()}`;
}

export function cmsDocumentHubHref(documentId: string): string {
  return `/documents#${cmsDocumentHubFragment(documentId)}`;
}

/**
 * Maps Event id → linked meeting document (newest wins).
 * Documents must be pre-sorted by displayOrder ascending (as from normalizePublicDocuments).
 */
export function buildLinkedAgendaDocumentByEventId(
  documents: readonly CmsPublicDocument[],
): Record<string, LinkedAgendaDocument> {
  const byEventId: Record<string, LinkedAgendaDocument> = {};

  for (let index = documents.length - 1; index >= 0; index -= 1) {
    const document = documents[index];
    if (document.sectionId !== 'meeting-documents') {
      continue;
    }

    const eventId = readLinkedEventId(document.keywords);
    if (!eventId || byEventId[eventId]) {
      continue;
    }

    byEventId[eventId] = {
      documentId: document.id,
      storageHref: document.href,
    };
  }

  return byEventId;
}

/** Maps Event id → document hub anchor for the newest linked meeting document. */
export function buildAgendaHubHrefByEventId(
  documents: readonly CmsPublicDocument[],
): Record<string, string> {
  const linked = buildLinkedAgendaDocumentByEventId(documents);

  return Object.fromEntries(
    Object.entries(linked).map(([eventId, document]) => [
      eventId,
      cmsDocumentHubHref(document.documentId),
    ]),
  );
}

export function formatMeetingDocumentTitle(
  eventTitle: string,
  eventStartIso: string,
  locale: string,
): string {
  const eventDate = formatEventDateLabel(eventStartIso, locale);
  const trimmedTitle = eventTitle.trim();

  if (!eventDate) {
    return trimmedTitle ? `${trimmedTitle} — Agenda` : 'Meeting agenda';
  }

  return trimmedTitle ? `${trimmedTitle} — Agenda (${eventDate})` : `Meeting agenda (${eventDate})`;
}

export function formatMeetingDocumentSummary(
  eventTitle: string,
  eventStartIso: string,
  locale: string,
): string {
  const eventDate = formatEventDateLabel(eventStartIso, locale);
  const trimmedTitle = eventTitle.trim() || 'Town meeting';

  if (!eventDate) {
    return `Agenda packet for ${trimmedTitle}.`;
  }

  return `Agenda packet for ${trimmedTitle} on ${eventDate}.`;
}

function formatEventDateLabel(eventStartIso: string, locale: string): string {
  const parsed = Date.parse(eventStartIso);
  if (Number.isNaN(parsed)) {
    return '';
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed));
}
