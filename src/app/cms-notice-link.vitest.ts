import { describe, expect, it } from 'vitest';
import {
  CMS_NEWSLETTER_SECTION_FRAGMENT,
  cmsNoticeFragmentId,
  getCmsNoticeCardLink,
  getCmsNoticeExternalCtaLabel,
  getCmsNoticeLinkAriaLabel,
  getCmsNoticeRouteLink,
} from './cms-notice-link';

const STORY_URL = 'https://storymaps.arcgis.com/stories/3e402c3303a84dcfb0d9ee6c60995349';

describe('cms-notice-link', () => {
  it('routes newsletters to the /news newsletter section', () => {
    expect(getCmsNoticeRouteLink({ id: 'june-newsletter', type: 'newsletter' })).toEqual({
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
    expect(getCmsNoticeLinkAriaLabel({ title: 'June Newsletter', type: 'newsletter' }, 'en')).toBe(
      'Read newsletter: June Newsletter',
    );
    expect(getCmsNoticeLinkAriaLabel({ title: 'Boletin de junio', type: 'newsletter' }, 'es')).toBe(
      'Leer el boletin: Boletin de junio',
    );
  });

  it('keeps newsletters internal even when imageUrl is a StoryMap', () => {
    expect(
      getCmsNoticeCardLink({
        id: 'june-newsletter',
        type: 'newsletter',
        imageUrl: STORY_URL,
      }),
    ).toEqual({
      isExternal: false,
      href: `/news#${CMS_NEWSLETTER_SECTION_FRAGMENT}`,
      path: '/news',
      fragment: CMS_NEWSLETTER_SECTION_FRAGMENT,
    });
  });

  it('opens a StoryMap imageUrl in a new tab for short notices', () => {
    expect(
      getCmsNoticeCardLink({
        id: '2c607cdc-f367-4655-85b0-91b2544e74a9',
        type: 'notice',
        imageUrl: STORY_URL,
      }),
    ).toEqual({
      isExternal: true,
      href: STORY_URL,
      path: null,
      kind: 'storymap',
    });
  });

  it('opens a generic webpage imageUrl in a new tab', () => {
    expect(
      getCmsNoticeCardLink({
        id: 'housing-page',
        type: 'notice',
        imageUrl: 'https://example.com/housing',
      }).isExternal,
    ).toBe(true);
  });

  it('keeps photo-only notices on the in-page fragment', () => {
    expect(
      getCmsNoticeCardLink({
        id: 'water-main-2026',
        type: 'notice',
        imageUrl: 'https://cdn.example.com/hydrant.webp',
      }),
    ).toMatchObject({
      isExternal: false,
      path: '/notices',
      fragment: 'notice-water-main-2026',
    });
  });

  it('builds bilingual StoryMap CTA and aria labels', () => {
    expect(getCmsNoticeExternalCtaLabel('storymap', 'en')).toBe('Open interactive Story Map');
    expect(getCmsNoticeExternalCtaLabel('storymap', 'es')).toBe('Abrir el mapa interactivo');
    expect(getCmsNoticeExternalCtaLabel('external', 'en')).toBe('Open link');
    expect(
      getCmsNoticeLinkAriaLabel(
        {
          id: '2c607cdc-f367-4655-85b0-91b2544e74a9',
          title: '2026 SECRHA Housing Needs Assessment',
          type: 'notice',
          imageUrl: STORY_URL,
        },
        'en',
      ),
    ).toBe('Open interactive Story Map: 2026 SECRHA Housing Needs Assessment (opens in new tab)');
  });
});
