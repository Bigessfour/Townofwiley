import { describe, expect, it } from 'vitest';
import {
  NEWSLETTER_PDF_INLINE_VIEWER_FRAGMENT,
  appendNewsletterPdfInlineViewerParams,
} from './newsletter-pdf-viewer';

describe('newsletter-pdf-viewer', () => {
  it('keeps a stable inline viewer fragment for regression checks', () => {
    expect(NEWSLETTER_PDF_INLINE_VIEWER_FRAGMENT).toBe('navpanes=0&pagemode=none&view=FitH');
  });

  it('appends thumbnail-hiding PDF open parameters after presigned query strings', () => {
    expect(
      appendNewsletterPdfInlineViewerParams('https://example.com/a.pdf?X-Amz-Signature=abc'),
    ).toBe(
      `https://example.com/a.pdf?X-Amz-Signature=abc#${NEWSLETTER_PDF_INLINE_VIEWER_FRAGMENT}`,
    );
  });

  it('appends viewer parameters to same-origin fixture paths used in e2e', () => {
    expect(appendNewsletterPdfInlineViewerParams('/fixtures/e2e-newsletter.pdf')).toBe(
      `/fixtures/e2e-newsletter.pdf#${NEWSLETTER_PDF_INLINE_VIEWER_FRAGMENT}`,
    );
  });

  it('leaves URLs that already have a hash unchanged', () => {
    expect(appendNewsletterPdfInlineViewerParams('https://example.com/a.pdf#page=2')).toBe(
      'https://example.com/a.pdf#page=2',
    );
  });

  it('returns blank input unchanged', () => {
    expect(appendNewsletterPdfInlineViewerParams('   ')).toBe('   ');
  });
});
