/**
 * Symbol + contract smoke for clerk record editor.
 * Docs: docs/CLERK-CMS-GUIDE.md (Edit content → on-page form → See on website)
 * E2E completeness: e2e/specs/smoke/admin.cms.spec.ts (opens editor for post-notice)
 */
import { describe, expect, it } from 'vitest';
import { CmsClerkRecordEditorComponent } from './cms-clerk-record-editor.component';

describe('CmsClerkRecordEditorComponent', () => {
  it('exports the clerk record editor surface', () => {
    expect(CmsClerkRecordEditorComponent.name).toBe('CmsClerkRecordEditorComponent');
  });
});
