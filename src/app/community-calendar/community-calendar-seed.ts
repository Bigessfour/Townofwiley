import type { CommunityEvent } from './community-calendar.types';

/**
 * Town-authored community events that ship with the site until (and unless)
 * the live Function URL returns the same `eventId`.
 *
 * First published event: community-wide yard sale day — 19 Sep 2026.
 */
export const BUNDLED_COMMUNITY_EVENTS: readonly CommunityEvent[] = [
  {
    eventId: 'tow-community-yard-sale-2026-09-19',
    title: 'Community-wide yard sale day',
    description:
      'Anyone in Wiley who wants to host a yard sale is welcome. When many sales happen the same day, it draws out-of-town visitors looking to browse more stops in one trip. Set up in your driveway or yard and join the town-wide day of treasure hunting.',
    category: 'yard_sale',
    location: 'Town of Wiley — throughout the community',
    startDateTime: '2026-09-19T14:00:00.000Z', // 8:00 AM MDT
    endDateTime: '2026-09-19T22:00:00.000Z', // 4:00 PM MDT
    audience: 'All ages',
    cost: 'Free to browse; prices set by each host',
  },
];

function isUpcoming(event: CommunityEvent, nowMs: number): boolean {
  const end = Date.parse(event.endDateTime || event.startDateTime);
  return Number.isFinite(end) && end > nowMs;
}

/** Merge live API events with bundled seeds (API wins on matching eventId). */
export function mergeCommunityEventsWithBundled(
  live: readonly CommunityEvent[],
  nowMs: number = Date.now(),
): CommunityEvent[] {
  const byId = new Map<string, CommunityEvent>();
  for (const event of BUNDLED_COMMUNITY_EVENTS) {
    if (isUpcoming(event, nowMs)) {
      byId.set(event.eventId, event);
    }
  }
  for (const event of live) {
    byId.set(event.eventId, event);
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime),
  );
}
