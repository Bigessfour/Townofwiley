import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HERO_IMAGE_PATH,
  isDurablePublicHeroImageUrl,
  isEphemeralCmsAssetUrl,
  resolvePublicHeroImageUrl,
} from './cms-public-asset-url';

describe('cms-public-asset-url', () => {
  it('detects AWS SigV4 temporary object URLs', () => {
    expect(
      isEphemeralCmsAssetUrl(
        'https://bucket.s3.us-east-2.amazonaws.com/key.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc',
      ),
    ).toBe(true);
    expect(isEphemeralCmsAssetUrl('https://townofwiley.gov/media/cms/hero/photo.webp')).toBe(
      false,
    );
  });

  it('falls back to bundled hero for empty or ephemeral URLs', () => {
    expect(resolvePublicHeroImageUrl(null)).toBe(DEFAULT_HERO_IMAGE_PATH);
    expect(
      resolvePublicHeroImageUrl(
        'https://example.s3.amazonaws.com/a.jpg?X-Amz-Credential=x&X-Amz-Signature=y',
      ),
    ).toBe(DEFAULT_HERO_IMAGE_PATH);
    expect(resolvePublicHeroImageUrl('https://townofwiley.gov/media/cms/hero/a.webp')).toBe(
      'https://townofwiley.gov/media/cms/hero/a.webp',
    );
  });

  it('accepts durable public hero URLs only', () => {
    expect(isDurablePublicHeroImageUrl('/hero-wiley.webp')).toBe(true);
    expect(isDurablePublicHeroImageUrl('https://townofwiley.gov/media/cms/hero/x.jpg')).toBe(
      true,
    );
    expect(
      isDurablePublicHeroImageUrl(
        'https://bucket.s3.amazonaws.com/x.jpg?X-Amz-Signature=deadbeef',
      ),
    ).toBe(false);
    expect(isDurablePublicHeroImageUrl('')).toBe(false);
  });
});
