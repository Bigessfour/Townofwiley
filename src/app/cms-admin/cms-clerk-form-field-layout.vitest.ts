import { describe, expect, it } from 'vitest';
import { clerkFormSectionTrack, clerkFormSections } from './cms-clerk-form-field-layout';
import type { ClerkFormFieldDefinition } from './cms-clerk-task-form-fields';

describe('cms-clerk-form-field-layout', () => {
  it('groups fields by group and collects optional fields', () => {
    const fields: ClerkFormFieldDefinition[] = [
      { name: 'title', label: 'Title', group: 'Main' },
      { name: 'detail', label: 'Detail', group: 'Main' },
      { name: 'imageUrl', label: 'Image', group: 'Advanced', optional: true },
      { name: 'active', label: 'Active', group: 'Publish' },
    ];
    const sections = clerkFormSections(fields);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({ type: 'group', title: 'Main', fields: [{ name: 'title' }, { name: 'detail' }] });
    expect(sections[1]).toMatchObject({ type: 'group', title: 'Publish' });
    expect(sections[2]).toMatchObject({ type: 'optional' });
    expect(sections[2]?.type === 'optional' && sections[2].fields.map((f) => f.name)).toEqual([
      'imageUrl',
    ]);
  });

  it('tracks section keys for Angular loops', () => {
    expect(clerkFormSectionTrack({ type: 'optional', fields: [] })).toBe('optional');
    expect(
      clerkFormSectionTrack({
        type: 'group',
        title: 'Notice text',
        fields: [],
      }),
    ).toBe('group:Notice text');
  });
});