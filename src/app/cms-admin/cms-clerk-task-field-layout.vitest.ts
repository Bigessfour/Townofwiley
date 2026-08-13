import { describe, expect, it } from 'vitest';
import { resolveFieldPreviewHint } from './cms-clerk-task-field-layout';
import { clerkTaskFormFields } from './cms-clerk-task-form-fields';

describe('cms-clerk-task-field-layout', () => {
  it('applies group labels for post-notice fields', () => {
    const fields = clerkTaskFormFields('post-notice');
    const title = fields.find((field) => field.name === 'title');
    expect(title?.group).toBe('Notice text');
    expect(title?.previewHint).toMatch(/\/news/);
  });

  it('resolves SiteCopy appears-on hints from the key field', () => {
    const keyField = { name: 'key', label: 'Key' };
    const hint = resolveFieldPreviewHint('edit-site-copy', keyField, {
      key: 'contactTownHallPhone',
    });
    expect(hint).toMatch(/contact/i);

    const valueField = { name: 'valueEn', label: 'English' };
    const valueHint = resolveFieldPreviewHint('edit-site-copy', valueField, {
      key: 'contactTownHallPhone',
    });
    expect(valueHint).toMatch(/Residents see this on/);
  });
});