import { describe, expect, it } from 'vitest';
import {
  datetimeLocalToIso,
  isoToDateInput,
  isoToDatetimeLocal,
} from './cms-clerk-datetime-fields';
import {
  clerkTaskFormFields,
  formValuesToMutationInput,
  recordToFormValues,
} from './cms-clerk-task-form-fields';

describe('cms-clerk-datetime-fields', () => {
  it('round-trips ISO datetimes through datetime-local inputs', () => {
    const iso = '2026-06-15T20:00:00.000Z';
    const local = isoToDatetimeLocal(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(datetimeLocalToIso(local)).toBe(iso);
  });

  it('normalizes AppSync date values for native date inputs', () => {
    expect(isoToDateInput('2026-06-15')).toBe('2026-06-15');
    expect(isoToDateInput('2026-06-15T00:00:00.000Z')).toBe('2026-06-15');
  });

  it('maps event records into datetime-local form values and back to ISO', () => {
    const fields = clerkTaskFormFields('add-meeting');
    const values = recordToFormValues(fields, {
      title: 'Council',
      start: '2026-06-15T20:00:00.000Z',
      active: true,
    });
    expect(values.start).toMatch(/2026-06-15T/);

    const input = formValuesToMutationInput(fields, {
      ...values,
      title: 'Council',
      active: true,
    });
    expect(input.start).toBe('2026-06-15T20:00:00.000Z');
  });
});