import { describe, expect, it } from 'vitest';
import { buildClerkSavePreviewLines } from './cms-clerk-save-preview';
import type { ClerkFormFieldDefinition } from './cms-clerk-task-form-fields';

const fields: ClerkFormFieldDefinition[] = [
  { name: 'title', label: 'Notice headline', required: true },
  { name: 'active', label: 'Show on website', type: 'checkbox' },
];

describe('cms-clerk-save-preview', () => {
  it('lists non-empty fields for a new record', () => {
    const lines = buildClerkSavePreviewLines(
      fields,
      { title: 'Water outage', active: true },
      null,
      false,
    );
    expect(lines.map((line) => line.label)).toEqual(['Notice headline', 'Show on website']);
    expect(lines[1]?.value).toMatch(/Yes/);
  });

  it('shows only changed fields when editing', () => {
    const baseline = { title: 'Old title', active: true };
    const lines = buildClerkSavePreviewLines(
      fields,
      { title: 'New title', active: true },
      baseline,
      true,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.value).toBe('New title');
  });
});