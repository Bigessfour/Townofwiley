import type { UploadedDocument } from '../document-upload.service';

/** What to store in the form after a presigned upload completes. */
export type ClerkUploadFieldValue = 'storageKey' | 'publicUrl';

export function resolveClerkUploadFieldValue(
  field: { uploadValue?: ClerkUploadFieldValue },
  uploaded: UploadedDocument,
): string {
  if (field.uploadValue === 'publicUrl') {
    return (uploaded.publicUrl ?? uploaded.url).trim();
  }
  return uploaded.id;
}

/** Preview HTTPS hero image URLs in the homepage editor after upload or manual paste. */
export function clerkUploadImagePreviewUrl(
  field: { uploadValue?: ClerkUploadFieldValue; accept?: string },
  rawValue: string | boolean,
): string | null {
  if (field.uploadValue !== 'publicUrl' || !field.accept?.includes('image')) {
    return null;
  }

  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!/^https?:\/\//i.test(value)) {
    return null;
  }

  return value;
}
