import { classifyCmsNoticeImageUrl, type CmsNoticeMediaKind } from './cms-notice-media';
import { AppRouteLink } from './internal-route-link';
import type { CmsNotice } from './site-cms-content';
import type { SiteLanguage } from './site-language';

export const CMS_NOTICE_FRAGMENT_PREFIX = 'notice';
export const CMS_NEWSLETTER_SECTION_FRAGMENT = 'town-newsletter-heading';

export type CmsNoticeExternalKind = Extract<CmsNoticeMediaKind, 'storymap' | 'external'>;

export type CmsNoticeCardLink =
  | {
      isExternal: false;
      href: string;
      path: string;
      fragment: string;
    }
  | {
      isExternal: true;
      href: string;
      path: null;
      kind: CmsNoticeExternalKind;
    };

/** Stable in-page anchor for a CMS notice row on `/notices`. */
export function cmsNoticeFragmentId(noticeId: string): string {
  const sanitized = noticeId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized ? `${CMS_NOTICE_FRAGMENT_PREFIX}-${sanitized}` : CMS_NOTICE_FRAGMENT_PREFIX;
}

/** Internal route for a CMS notice or newsletter card (homepage, /notices, /news lists). */
export function getCmsNoticeRouteLink(
  notice: Pick<CmsNotice, 'type'> & Partial<Pick<CmsNotice, 'id'>>,
): AppRouteLink {
  if (notice.type === 'newsletter') {
    return {
      href: `/news#${CMS_NEWSLETTER_SECTION_FRAGMENT}`,
      isInternal: true,
      path: '/news',
      fragment: CMS_NEWSLETTER_SECTION_FRAGMENT,
    };
  }

  const fragment = cmsNoticeFragmentId(notice.id ?? '');

  return {
    href: `/notices#${fragment}`,
    isInternal: true,
    path: '/notices',
    fragment,
  };
}

/**
 * Card destination: newsletters and photo-only notices stay in-app; a webpage or
 * StoryMap in `imageUrl` opens in a new tab (never as `<img>`).
 */
export function getCmsNoticeCardLink(
  notice: Pick<CmsNotice, 'type'> & Partial<Pick<CmsNotice, 'id' | 'imageUrl'>>,
): CmsNoticeCardLink {
  const internal = getCmsNoticeRouteLink(notice);
  const path = internal.path ?? (notice.type === 'newsletter' ? '/news' : '/notices');
  const fragment =
    internal.fragment ??
    (notice.type === 'newsletter'
      ? CMS_NEWSLETTER_SECTION_FRAGMENT
      : cmsNoticeFragmentId(notice.id ?? ''));

  if (notice.type === 'newsletter') {
    return { isExternal: false, href: internal.href, path, fragment };
  }

  const media = classifyCmsNoticeImageUrl(notice.imageUrl);
  if (media.kind === 'storymap' || media.kind === 'external') {
    return {
      isExternal: true,
      href: media.externalHref ?? '',
      path: null,
      kind: media.kind,
    };
  }

  return { isExternal: false, href: internal.href, path, fragment };
}

export function getCmsNoticeExternalCtaLabel(
  kind: CmsNoticeExternalKind,
  language: SiteLanguage,
): string {
  if (kind === 'storymap') {
    return language === 'es' ? 'Abrir el mapa interactivo' : 'Open interactive Story Map';
  }

  return language === 'es' ? 'Abrir enlace' : 'Open link';
}

export function getCmsNoticeExternalLinkSuffix(language: SiteLanguage): string {
  return language === 'es' ? 'se abre en una pestana nueva' : 'opens in new tab';
}

export function getCmsNoticeLinkAriaLabel(
  notice: Pick<CmsNotice, 'title' | 'type'> & Partial<Pick<CmsNotice, 'id' | 'imageUrl'>>,
  language: SiteLanguage,
): string {
  const title = notice.title.trim();
  const card = getCmsNoticeCardLink(notice);

  if (card.isExternal) {
    const cta = getCmsNoticeExternalCtaLabel(card.kind, language);
    const suffix = getCmsNoticeExternalLinkSuffix(language);
    return `${cta}: ${title} (${suffix})`;
  }

  if (notice.type === 'newsletter') {
    return language === 'es' ? `Leer el boletin: ${title}` : `Read newsletter: ${title}`;
  }

  return language === 'es' ? `Leer el aviso: ${title}` : `Read notice: ${title}`;
}
