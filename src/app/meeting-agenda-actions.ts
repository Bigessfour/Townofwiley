import { MessageService } from 'primeng/api';
import type { LinkedAgendaDocument } from './public-document-event-link';

export interface MeetingAgendaToastCopy {
  summary: string;
  detail: string;
}

export async function resolveAgendaUrlsByEventId(
  linkedByEventId: Record<string, LinkedAgendaDocument>,
  resolveHref: (href: string) => Promise<string>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    Object.entries(linkedByEventId).map(async ([eventId, linked]) => {
      try {
        const url = await resolveHref(linked.storageHref);
        return [eventId, url] as const;
      } catch {
        return null;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is [string, string] => entry !== null));
}

export function showAgendaUnavailableToast(
  messages: MessageService,
  copy: MeetingAgendaToastCopy,
): void {
  messages.add({
    severity: 'info',
    summary: copy.summary,
    detail: copy.detail,
    life: 6000,
  });
}

export function openAgendaPdfInNewTab(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
