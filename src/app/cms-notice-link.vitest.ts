import { describe, expect, it } from 'vitest';
import {
  CMS_NEWSLETTER_SECTION_FRAGMENT,
  cmsNoticeFragmentId,
  getCmsNoticeLinkAriaLabel,
  getCmsNoticeRouteLink,
} from './cms-notice-link';

describe('cms-notice-link', () => {
  it('routes newsletters to the /news newsletter section', () => {
    expect(
      getCmsNoticeRouteLink({ id: 'june-newsletter', type: 'newsletter' }),
    ).toEqual({
      href: `/news#${CMS_NEWSLETTER_SECTION_FRAGMENT}`,
      isInternal: true,
      path: '/news',
      fragment: CMS_NEWSLETTER_SECTION_FRAGMENT,
    });
  });

  it('routes standard notices to /notices with a stable fragment', () => {
    expect(getCmsNoticeRouteLink({ id: 'water-main-2026', type: 'notice' })).toEqual({
      href: '/notices#notice-water-main-2026',
      isInternal: true,
      path: '/notices',
      fragment: 'notice-water-main-2026',
    });
  });

  it('sanitizes notice ids for fragment anchors', () => {
    expect(cmsNoticeFragmentId('  June Newsletter!  ')).toBe('notice-June-Newsletter');
  });

  it('builds bilingual aria labels', () => {
    expect(
      getCmsNoticeLinkAriaLabel({ title: 'June Newsletter', type: 'newsletter' }, 'en'),
    ).toBe('Read newsletter: June Newsletter');
    expect(
      getCmsNoticeLinkAriaLabel({ title: 'Boletin de junio', type: 'newsletter' }, 'es'),
    ).toBe('Leer el boletin: Boletin de junio');
  });
});
