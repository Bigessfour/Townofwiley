import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from './leadership-roster-group-ids';

export interface LeadershipRosterSeedEntry {
  id: string;
  groupId: string;
  lineEn: string;
  lineEs: string;
  displayOrder: number;
}

/** Initial AppSync rows — keep in sync with `scripts/seed-cms-production-data.py`. */
export const LEADERSHIP_ROSTER_SEED_ENTRIES: readonly LeadershipRosterSeedEntry[] = [
  {
    id: 'roster-mayor-council-0',
    groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    lineEn: 'Mayor: Steve McKitrick',
    lineEs: 'Alcalde: Steve McKitrick',
    displayOrder: 0,
  },
  {
    id: 'roster-mayor-council-1',
    groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    lineEn: 'Councilman: Julie Esgar',
    lineEs: 'Concejal: Julie Esgar',
    displayOrder: 1,
  },
  {
    id: 'roster-mayor-council-2',
    groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    lineEn: 'Councilman: Dale Specht',
    lineEs: 'Concejal: Dale Specht',
    displayOrder: 2,
  },
  {
    id: 'roster-mayor-council-3',
    groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    lineEn: 'Councilman: Dale Stewart',
    lineEs: 'Concejal: Dale Stewart',
    displayOrder: 3,
  },
  {
    id: 'roster-mayor-council-4',
    groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    lineEn: 'Councilman: Alan Campbell',
    lineEs: 'Concejal: Alan Campbell',
    displayOrder: 4,
  },
  {
    id: 'roster-mayor-council-5',
    groupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    lineEn: 'Councilman: Sandy Coen',
    lineEs: 'Concejal: Sandy Coen',
    displayOrder: 5,
  },
  {
    id: 'roster-town-administration-0',
    groupId: LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
    lineEn: 'City Clerk: Deb Dillon',
    lineEs: 'Secretaria municipal: Deb Dillon',
    displayOrder: 0,
  },
  {
    id: 'roster-town-administration-1',
    groupId: LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
    lineEn: 'Town Superintendent: Scott Whitman',
    lineEs: 'Superintendente del pueblo: Scott Whitman',
    displayOrder: 1,
  },
];

export const LEADERSHIP_GROUP_FORM_OPTIONS = [
  {
    value: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
    label: 'Elected Officials (Mayor & Council)',
  },
  {
    value: LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
    label: 'Town Administration',
  },
] as const;

export function leadershipGroupLabel(groupId: string): string {
  return (
    LEADERSHIP_GROUP_FORM_OPTIONS.find((option) => option.value === groupId)?.label ?? groupId
  );
}
