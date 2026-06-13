import { AppRouteLink } from './internal-route-link';
import type { CmsNotice } from './site-cms-content';
import type { SiteLanguage } from './site-language';

export const CMS_NOTICE_FRAGMENT_PREFIX = 'notice';
export const CMS_NEWSLETTER_SECTION_FRAGMENT = 'town-newsletter-heading';

/** Stable in-page anchor for a CMS notice row on `/notices`. */
export function cmsNoticeFragmentId(noticeId: string): string {
  const sanitized = noticeId
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized ? `${CMS_NOTICE_FRAGMENT_PREFIX}-${sanitized}` : CMS_NOTICE_FRAGMENT_PREFIX;
}

/** Internal route for a CMS notice or newsletter card (homepage, /notices, /news lists). */
export function getCmsNoticeRouteLink(notice: Pick<CmsNotice, 'id' | 'type'>): AppRouteLink {
  if (notice.type === 'newsletter') {
    return {
      href: `/news#${CMS_NEWSLETTER_SECTION_FRAGMENT}`,
      isInternal: true,
      path: '/news',
      fragment: CMS_NEWSLETTER_SECTION_FRAGMENT,
    };
  }

  const fragment = cmsNoticeFragmentId(notice.id);

  return {
    href: `/notices#${fragment}`,
    isInternal: true,
    path: '/notices',
    fragment,
  };
}

export function getCmsNoticeLinkAriaLabel(
  notice: Pick<CmsNotice, 'title' | 'type'>,
  language: SiteLanguage,
): string {
  const title = notice.title.trim();

  if (notice.type === 'newsletter') {
    return language === 'es' ? `Leer el boletin: ${title}` : `Read newsletter: ${title}`;
  }

  return language === 'es' ? `Leer el aviso: ${title}` : `Read notice: ${title}`;
}
