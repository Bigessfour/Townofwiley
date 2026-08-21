import { CMS_NEWSLETTER_SECTION_FRAGMENT, cmsNoticeFragmentId } from '../cms-notice-link';
import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from '../leadership-roster-group-ids';
import { clerkTaskById, type ClerkCmsTaskId } from './cms-clerk-tasks';

/**
 * Single source of truth for every "See on live site" URL surfaced by `/admin`.
 *
 * Two entry points:
 *  - {@link buildClerkTaskHubLiveLink} — section-level link on the task hub card (no saved id yet).
 *  - {@link buildClerkTaskLiveLink} — per-record link rendered after a successful save.
 *
 * Each task contributes a `previewPath` (from {@link ClerkCmsTask}) and an optional
 * `hubFragment` + `buildRecordFragment` from {@link TASK_LIVE_LINK_MAP}. Composed they form
 * `https://townofwiley.gov{previewPath}#{fragment}`. Tasks with `showPublicPreview: false`
 * Tasks that opt out of a public live-site link return `null` from both helpers so the UI hides the link.
 *
 * Public DOM ids the fragments target are listed in
 * [`docs/cms-edit-mode-verify-matrix.md`](../../../docs/cms-edit-mode-verify-matrix.md).
 */

/** Mirrors {@link clerkTaskPreviewUrl} — kept here so the builder is self-contained for tests. */
const PUBLIC_SITE_ORIGIN = 'https://townofwiley.gov';

export interface ClerkLiveLinkInput {
  taskId: ClerkCmsTaskId;
  /** AppSync record id returned by the create/update mutation. Required for per-record fragments. */
  savedId?: string | null;
  /** Form values at save time. Used by tasks that branch on a field (announcementKind, groupId). */
  formValues?: Readonly<Record<string, unknown>>;
}

type RecordFragmentBuilder = (
  savedId: string,
  formValues: Readonly<Record<string, unknown>>,
) => string;

type RecordPathBuilder = (savedId: string, formValues: Readonly<Record<string, unknown>>) => string;

interface TaskLiveLinkEntry {
  /** Fragment for the task-hub "See on website" link — no save id yet, so section-level. */
  readonly hubFragment?: string;
  /** Optional task-hub path override (defaults to the task's `previewPath`). */
  readonly hubPath?: string;
  /** Builds the fragment for the post-save "See on live site" button when `savedId` is known. */
  readonly buildRecordFragment?: RecordFragmentBuilder;
  /** Builds the path for the post-save URL when it differs from the task's `previewPath`. */
  readonly buildRecordPath?: RecordPathBuilder;
}

const TASK_LIVE_LINK_MAP: Readonly<Record<ClerkCmsTaskId, TaskLiveLinkEntry>> = {
  'post-notice': {
    hubFragment: 'recent-town-notices-heading',
    buildRecordFragment: (savedId, formValues) => {
      const kind = readString(formValues, 'announcementKind');
      if (kind === 'newsletter') {
        return CMS_NEWSLETTER_SECTION_FRAGMENT;
      }
      return cmsNoticeFragmentId(savedId);
    },
    buildRecordPath: () => '/news',
  },
  'add-meeting': {
    hubFragment: 'calendar',
    buildRecordFragment: (savedId) => `event-${savedId}`,
  },
  'upload-meeting-documents': {
    hubFragment: 'meeting-documents-archive-heading',
  },
  homepage: {
    hubFragment: 'site-hero-title',
  },
  'update-contact-page': {
    hubFragment: 'contact',
    hubPath: '/contact',
  },
  'update-contacts': {
    hubFragment: 'contact-administration',
    buildRecordFragment: (savedId) => `contact-${savedId}`,
  },
  'update-leadership': {
    hubFragment: 'leadership',
    buildRecordFragment: (savedId, formValues) => {
      const rawGroupId = readString(formValues, 'groupId');
      const groupId = isKnownLeadershipGroup(rawGroupId) ? rawGroupId : 'group';
      return `leadership-row-${groupId}-${savedId}`;
    },
  },
  'business-directory': {
    hubFragment: 'business-directory-heading',
    buildRecordFragment: (savedId) => `business-${savedId}`,
  },
  'external-news': {
    hubFragment: 'external-news-heading',
    buildRecordFragment: (savedId) => `external-news-${savedId}`,
  },
  'emergency-banner': {
    hubFragment: 'site-alert-title',
  },
  'edit-site-copy': {
    hubFragment: 'top-tasks-heading',
  },
  'manage-community-calendar': {
    hubFragment: 'community',
  },
};

/**
 * Tasks that intentionally do not surface a live-site link.
 * Used by the test suite to enforce that any new task is either opted out or has a link entry.
 */
export const TASKS_WITHOUT_LIVE_LINK: ReadonlySet<ClerkCmsTaskId> = new Set(
  Object.entries(TASK_LIVE_LINK_MAP)
    .filter(([, entry]) => !entry.hubFragment && !entry.buildRecordFragment)
    .map(([taskId]) => taskId as ClerkCmsTaskId),
);

/** Section-level URL for the task-hub "See on website" card. Returns `null` when not applicable. */
export function buildClerkTaskHubLiveLink(taskId: ClerkCmsTaskId): string | null {
  const task = clerkTaskById(taskId);
  if (!task || task.showPublicPreview === false) {
    return null;
  }
  const entry = TASK_LIVE_LINK_MAP[taskId];
  if (!entry) {
    return null;
  }
  return composeUrl(entry.hubPath ?? task.previewPath, entry.hubFragment);
}

/** Per-record URL for the post-save "See on live website" button. Returns `null` when not applicable. */
export function buildClerkTaskLiveLink(input: ClerkLiveLinkInput): string | null {
  const task = clerkTaskById(input.taskId);
  if (!task || task.showPublicPreview === false) {
    return null;
  }
  const entry = TASK_LIVE_LINK_MAP[input.taskId];
  if (!entry) {
    return null;
  }

  const trimmedSavedId = typeof input.savedId === 'string' ? input.savedId.trim() : '';
  const formValues = input.formValues ?? {};

  if (entry.buildRecordFragment && trimmedSavedId) {
    const fragment = entry.buildRecordFragment(trimmedSavedId, formValues);
    const path = entry.buildRecordPath
      ? entry.buildRecordPath(trimmedSavedId, formValues)
      : task.previewPath;
    return composeUrl(path, fragment);
  }

  return composeUrl(entry.hubPath ?? task.previewPath, entry.hubFragment);
}

function composeUrl(previewPath: string, fragment?: string): string {
  const normalizedPath = previewPath.startsWith('/') ? previewPath : `/${previewPath}`;
  const trimmedFragment = typeof fragment === 'string' ? fragment.trim() : '';
  if (!trimmedFragment) {
    return `${PUBLIC_SITE_ORIGIN}${normalizedPath}`;
  }
  return `${PUBLIC_SITE_ORIGIN}${normalizedPath}#${trimmedFragment}`;
}

function readString(values: Readonly<Record<string, unknown>>, key: string): string {
  const raw = values[key];
  return typeof raw === 'string' ? raw.trim() : '';
}

function isKnownLeadershipGroup(value: string): boolean {
  return (
    value === LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL ||
    value === LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION
  );
}
