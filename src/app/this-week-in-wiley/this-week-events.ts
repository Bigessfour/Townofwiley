/**
 * Homepage “This week in Wiley” helpers — upcoming community + official events.
 * Prefer events in the next 7 days; otherwise surface the next few upcoming.
 */

export interface ThisWeekEventItem {
  id: string;
  title: string;
  startDateTime: string;
  endDateTime?: string | null;
  location?: string;
  source: 'community' | 'official';
  href: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 4;

export function selectThisWeekOrUpcoming(
  items: readonly ThisWeekEventItem[],
  nowMs: number = Date.now(),
): { mode: 'thisWeek' | 'comingUp'; events: ThisWeekEventItem[] } {
  const upcoming = items
    .filter((item) => {
      const end = Date.parse(item.endDateTime || item.startDateTime);
      return !Number.isNaN(end) && end >= nowMs;
    })
    .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));

  const thisWeek = upcoming.filter((item) => {
    const start = Date.parse(item.startDateTime);
    return start <= nowMs + WEEK_MS;
  });

  if (thisWeek.length) {
    return { mode: 'thisWeek', events: thisWeek.slice(0, MAX_ITEMS) };
  }

  return { mode: 'comingUp', events: upcoming.slice(0, MAX_ITEMS) };
}
