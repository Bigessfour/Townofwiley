/**
 * Stable `groupId` values for `LeadershipRosterEntry` in Amplify Studio.
 * Must match `APP_COPY.*.leadershipGroups[].groupId` in `app.ts`.
 */
export const LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL = 'mayor-council';
export const LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION = 'town-administration';

export const LEADERSHIP_ROSTER_GROUP_IDS: ReadonlySet<string> = new Set([
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
]);
