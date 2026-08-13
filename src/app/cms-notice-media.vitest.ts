import { describe, expect, it } from 'vitest';
import {
  arcGisStoryMapCoverUrl,
  classifyCmsNoticeImageUrl,
  hideBrokenNoticeThumbnail,
  parseArcGisStoryMapItemId,
} from './cms-notice-media';

const STORY_ID = '3e402c3303a84dcfb0d9ee6c60995349';
const STORY_URL = `https://storymaps.arcgis.com/stories/${STORY_ID}`;

describe('cms-notice-media', () => {
  it('returns none for empty, non-https, and invalid values', () => {
    expect(classifyCmsNoticeImageUrl(undefined).kind).toBe('none');
    expect(classifyCmsNoticeImageUrl('').kind).toBe('none');
    expect(classifyCmsNoticeImageUrl('javascript:alert(1)').kind).toBe('none');
    expect(classifyCmsNoticeImageUrl('http://example.com/photo.png').kind).toBe('none');
    expect(classifyCmsNoticeImageUrl('not a url').kind).toBe('none');
  });

  it('classifies raster image pathnames as photos, ignoring query strings', () => {
    expect(classifyCmsNoticeImageUrl('https://cdn.example.com/cover.webp')).toEqual({
      kind: 'photo',
      photoUrl: 'https://cdn.example.com/cover.webp',
    });
    expect(
      classifyCmsNoticeImageUrl(
        `https://cdn.arcgis.com/sharing/rest/content/items/${STORY_ID}/resources/pWdqdHGexKbCO6Gg75WBz.png?w=400`,
      ),
    ).toMatchObject({ kind: 'photo' });
    expect(classifyCmsNoticeImageUrl('https://townofwiley.gov/media/notice.jpg')).toMatchObject({
      kind: 'photo',
    });
  });

  it('classifies StoryMap URLs as outbound stories with an item thumbnail', () => {
    const classified = classifyCmsNoticeImageUrl(STORY_URL);
    expect(classified).toEqual({
      kind: 'storymap',
      externalHref: STORY_URL,
      thumbnailUrl: arcGisStoryMapCoverUrl(STORY_ID),
    });
    expect(classifyCmsNoticeImageUrl(`${STORY_URL}/edit`).externalHref).toBe(STORY_URL);
  });

  it('parses StoryMap item ids and builds the ArcGIS thumbnail URL', () => {
    expect(parseArcGisStoryMapItemId(STORY_URL)).toBe(STORY_ID);
    expect(parseArcGisStoryMapItemId(`${STORY_URL}/`)).toBe(STORY_ID);
    expect(parseArcGisStoryMapItemId('https://example.com/stories/nope')).toBeNull();
    expect(arcGisStoryMapCoverUrl(STORY_ID)).toBe(
      `https://www.arcgis.com/sharing/rest/content/items/${STORY_ID}/info/thumbnail/thumbnail.jpeg`,
    );
  });

  it('treats other https pages and PDFs as external links, not images', () => {
    expect(classifyCmsNoticeImageUrl('https://example.com/housing-study')).toEqual({
      kind: 'external',
      externalHref: 'https://example.com/housing-study',
    });
    expect(classifyCmsNoticeImageUrl('https://townofwiley.gov/documents/report.pdf')).toMatchObject(
      { kind: 'external' },
    );
  });

  it('hides a broken thumbnail image', () => {
    const img = document.createElement('img');
    hideBrokenNoticeThumbnail({ target: img } as unknown as Event);
    expect(img.hidden).toBe(true);
  });
});
