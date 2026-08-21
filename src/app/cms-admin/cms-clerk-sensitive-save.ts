import type { ClerkCmsTaskId } from './cms-clerk-tasks';

/** Second-step confirm for high-impact clerk saves (Phase 3 live preview deferred). */
export function confirmClerkSensitiveSave(
  taskId: ClerkCmsTaskId,
  values: Readonly<Record<string, string | boolean>>,
): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  if (taskId === 'emergency-banner' && values['enabled'] === true) {
    return window.confirm(
      'Turn on the emergency banner strip at the top of the site for all visitors?\n\nClick OK to save, or Cancel to keep editing.',
    );
  }

  if (taskId === 'post-notice' && values['active'] === false) {
    return window.confirm(
      'This notice will be hidden from the public site (Show on website is off).\n\nSave anyway?',
    );
  }

  return true;
}

export function confirmMeetingDocumentUpload(meetingLabel: string, fileName: string): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.confirm(
    `Publish this PDF on /meetings?\n\nMeeting: ${meetingLabel}\nFile: ${fileName}\n\nClick OK to upload and publish.`,
  );
}
