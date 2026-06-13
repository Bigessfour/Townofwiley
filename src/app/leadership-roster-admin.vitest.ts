import { describe, expect, it } from 'vitest';

import {
  buildLeadershipInsertOptions,
  LEADERSHIP_INSERT_BOTTOM,
  LEADERSHIP_INSERT_TOP,
  prepareLeadershipRosterMutationInput,
  resolveLeadershipInsertIndex,
} from './leadership-roster-admin';

describe('leadership-roster-admin', () => {
  it('defaults empty Spanish to English on create', () => {
    const input = prepareLeadershipRosterMutationInput({ lineEn: 'Councilman: Ken Mooney' });
    expect(input.lineEs).toBe('Councilman: Ken Mooney');
  });

  it('does not overwrite Spanish on update when omitted', () => {
    const input = prepareLeadershipRosterMutationInput({ lineEn: 'Mayor: Pat Garcia' }, 'abc');
    expect(input.lineEs).toBeUndefined();
  });

  it('builds insert options for top, after each row, and bottom', () => {
    const options = buildLeadershipInsertOptions([
      { id: 'a', lineEn: 'Mayor: Jane Doe' },
      { id: 'b', lineEn: 'Councilman: Sam Lee' },
    ]);

    expect(options[0]?.value).toBe(LEADERSHIP_INSERT_TOP);
    expect(options.some((option) => option.value === 'after:a')).toBe(true);
    expect(options.at(-1)?.value).toBe(LEADERSHIP_INSERT_BOTTOM);
  });

  it('resolves insert index for top, after, and bottom', () => {
    const records = [{ id: 'a' }, { id: 'b' }];
    expect(resolveLeadershipInsertIndex(LEADERSHIP_INSERT_TOP, records)).toBe(0);
    expect(resolveLeadershipInsertIndex('after:a', records)).toBe(1);
    expect(resolveLeadershipInsertIndex(LEADERSHIP_INSERT_BOTTOM, records)).toBe(2);
  });
});
