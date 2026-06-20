import { describe, expect, it } from 'vitest';
import {
  electedRosterMissingMayorLine,
  leadershipLineLooksLikeMayor,
} from './leadership-roster-mayor-check';

describe('leadershipLineLooksLikeMayor', () => {
  it('matches colon format', () => {
    expect(leadershipLineLooksLikeMayor('Mayor: Steve McKitrick')).toBe(true);
    expect(leadershipLineLooksLikeMayor('Alcalde: Steve McKitrick')).toBe(true);
  });

  it('matches dash format', () => {
    expect(leadershipLineLooksLikeMayor('Mayor - Steve McKitrick')).toBe(true);
  });

  it('does not match trustee or mayor pro tem lines', () => {
    expect(leadershipLineLooksLikeMayor('Trustee - Ken Mooney')).toBe(false);
    expect(leadershipLineLooksLikeMayor('Trustee (Mayor Pro Tem) - Dale Stewart')).toBe(false);
  });
});

describe('electedRosterMissingMayorLine', () => {
  it('returns false when group is empty', () => {
    expect(electedRosterMissingMayorLine([])).toBe(false);
  });

  it('returns true when mayor-council has trustees only', () => {
    expect(
      electedRosterMissingMayorLine([
        { groupId: 'mayor-council', lineEn: 'Trustee - Ken Mooney', active: true },
      ]),
    ).toBe(true);
  });

  it('returns false when a mayor line exists', () => {
    expect(
      electedRosterMissingMayorLine([
        { groupId: 'mayor-council', lineEn: 'Mayor: Steve McKitrick', active: true },
        { groupId: 'mayor-council', lineEn: 'Trustee - Ken Mooney', active: true },
      ]),
    ).toBe(false);
  });
});
