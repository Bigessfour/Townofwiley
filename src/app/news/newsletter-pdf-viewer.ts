/**
 * Adobe PDF open parameters for the inline newsletter iframe on `/news`.
 * The hash is not sent to S3, so it is safe to append after presigned URLs.
 */
export const NEWSLETTER_PDF_INLINE_VIEWER_FRAGMENT = 'navpanes=0&pagemode=none&view=FitH' as const;

/** Builds the iframe `src` for an already-resolved newsletter PDF URL. */
export function appendNewsletterPdfInlineViewerParams(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed.includes('#')) {
    return url;
  }

  return `${trimmed}#${NEWSLETTER_PDF_INLINE_VIEWER_FRAGMENT}`;
}
