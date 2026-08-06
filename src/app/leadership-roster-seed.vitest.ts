import { describe, expect, it } from 'vitest';
import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from './leadership-roster-group-ids';
import { leadershipGroupLabel } from './leadership-roster-seed';

describe('leadershipGroupLabel', () => {
  it('returns known group labels', () => {
    expect(leadershipGroupLabel(LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL)).toContain('Mayor');
    expect(leadershipGroupLabel(LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION)).toContain(
      'Administration',
    );
  });

  it('returns the raw id when unknown', () => {
    expect(leadershipGroupLabel('custom-group')).toBe('custom-group');
  });
});
