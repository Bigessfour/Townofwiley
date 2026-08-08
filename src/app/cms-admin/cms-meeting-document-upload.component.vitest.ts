/**
 * Symbol smoke for meeting agenda upload.
 * Docs: docs/CLERK-CMS-GUIDE.md (Upload a meeting agenda or packet)
 * E2E completeness: e2e/specs/smoke/admin.cms.spec.ts (/admin#documents upload panel)
 */
import { describe, expect, it } from 'vitest';
import { CmsMeetingDocumentUploadComponent } from './cms-meeting-document-upload.component';

describe('CmsMeetingDocumentUploadComponent', () => {
  it('exports the meeting document upload surface', () => {
    expect(CmsMeetingDocumentUploadComponent.name).toBe('CmsMeetingDocumentUploadComponent');
  });
});
