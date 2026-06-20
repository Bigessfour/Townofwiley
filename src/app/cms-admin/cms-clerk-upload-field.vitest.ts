import { describe, expect, it } from 'vitest';
import {
  clerkUploadImagePreviewUrl,
  resolveClerkUploadFieldValue,
} from './cms-clerk-upload-field';

describe('resolveClerkUploadFieldValue', () => {
  it('uses publicUrl for homepage hero uploads', () => {
    expect(
      resolveClerkUploadFieldValue(
        { uploadValue: 'publicUrl' },
        {
          id: 'media/cms/hero/x.jpg',
          name: 'x.jpg',
          size: 1,
          type: 'image/jpeg',
          url: 'https://example.com/x.jpg',
          publicUrl: 'https://townofwiley.gov/media/cms/hero/x.jpg',
          uploadedAt: new Date(),
          sectionId: 'cms-uploads/hero',
        },
      ),
    ).toBe('https://townofwiley.gov/media/cms/hero/x.jpg');
  });

  it('uses storage id for newsletter PDF uploads', () => {
    expect(
      resolveClerkUploadFieldValue(
        { uploadValue: 'storageKey' },
        {
          id: 'documents/newsletter/a.pdf',
          name: 'a.pdf',
          size: 1,
          type: 'application/pdf',
          url: 'https://example.com/a.pdf',
          uploadedAt: new Date(),
          sectionId: 'newsletter',
        },
      ),
    ).toBe('documents/newsletter/a.pdf');
  });
});

describe('clerkUploadImagePreviewUrl', () => {
  it('returns https hero URLs for preview', () => {
    expect(
      clerkUploadImagePreviewUrl(
        { uploadValue: 'publicUrl', accept: 'image/jpeg,image/png' },
        'https://townofwiley.gov/media/cms/hero/photo.webp',
      ),
    ).toBe('https://townofwiley.gov/media/cms/hero/photo.webp');
  });

  it('returns null for storage keys', () => {
    expect(
      clerkUploadImagePreviewUrl(
        { uploadValue: 'publicUrl', accept: 'image/jpeg' },
        'documents/newsletter/x.pdf',
      ),
    ).toBeNull();
  });
});
