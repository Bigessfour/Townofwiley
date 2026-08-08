/**
 * Docs: docs/CLERK-CMS-GUIDE.md / meetings documents section
 * E2E: e2e/specs/smoke/feature-pages.spec.ts, docs-hub.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { MeetingDocumentsArchiveComponent } from './meeting-documents-archive.component';

describe('MeetingDocumentsArchiveComponent', () => {
  it('exports the meeting documents archive surface', () => {
    expect(MeetingDocumentsArchiveComponent.name).toBe('MeetingDocumentsArchiveComponent');
  });
});
