import type { ClerkCmsTaskId } from './cms-clerk-tasks';

/** Presets the generic record editor uses when opened from the Contact page chooser. */
export interface ClerkRecordEditorOptions {
  /** Lock leadership edits to this group and hide the list dropdown. */
  lockedGroupId?: string;
  /** Keep only matching saved rows in the picker / reorder list. */
  recordMatch?: (record: Record<string, unknown>) => boolean;
  /** Limit SiteCopy key choices (Town Hall card vs menu headings). */
  allowedSiteCopyKeys?: readonly string[];
  /** Hide “Add new” when clerks should only edit existing rows. */
  hideAddNew?: boolean;
  /** After load, open this record id when present. */
  autoEditRecordId?: string;
  /** Clerk-visible fields only; other schema fields still load and save. */
  visibleFieldNames?: readonly string[];
  /** Section-level “See on website” URL before a save. */
  liveSiteUrl?: string;
  /** When false, keep liveSiteUrl even after save (section pages, not per-row anchors). */
  useRecordLiveLink?: boolean;
  titleOverride?: string;
  purposeOverride?: string;
  leadOverride?: string;
  recordLabel?: (record: Record<string, unknown>) => string;
}

export type ContactPageSectionId =
  | 'town-hall'
  | 'admin-names'
  | 'staff-emails'
  | 'agenda-note'
  | 'elected';

export interface ContactPageSection {
  id: ContactPageSectionId;
  title: string;
  description: string;
  help: string;
  editorTaskId: ClerkCmsTaskId;
  editorOptions: ClerkRecordEditorOptions;
}
