/** How Announcement.imageUrl should appear on notice/news cards. */
export type CmsNoticeMediaKind = 'none' | 'photo' | 'storymap' | 'external';

export interface CmsNoticeMedia {
  kind: CmsNoticeMediaKind;
  /** Raster image for `<img ngSrc>`. */
  photoUrl?: string;
  /** Best-effort ArcGIS item thumbnail for StoryMaps (native `<img>`, hide on error). */
  thumbnailUrl?: string;
  /** Webpage or StoryMap to open in a new tab — never used as `<img ngSrc>`. */
  externalHref?: string;
}

const RASTER_PATHNAME = /\.(avif|gif|jpe?g|png|svg|webp)$/i;
const STORYMAP_HOST = /(^|\.)storymaps\.arcgis\.com$/i;
const STORYMAP_ITEM_PATH = /^\/stories\/([a-zA-Z0-9_-]+)(?:\/|$)/i;

function parseHttpsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/** ArcGIS StoryMaps item id from a published story URL, or null. */
export function parseArcGisStoryMapItemId(raw: string | URL): string | null {
  const url = typeof raw === 'string' ? parseHttpsUrl(raw.trim()) : raw;
  if (!url || !STORYMAP_HOST.test(url.hostname)) {
    return null;
  }

  const match = url.pathname.match(STORYMAP_ITEM_PATH);
  return match?.[1] ?? null;
}

/** Public ArcGIS item thumbnail for a StoryMap (no AppSync or connect-src fetch). */
export function arcGisStoryMapCoverUrl(itemId: string): string {
  const id = itemId.trim();
  return `https://www.arcgis.com/sharing/rest/content/items/${id}/info/thumbnail/thumbnail.jpeg`;
}

/**
 * Classify a CMS `imageUrl`: photos render as images; StoryMaps and other pages
 * are outbound links (pasting a story into the image field caused ORB-blocked `<img>`).
 */
export function classifyCmsNoticeImageUrl(raw?: string | null): CmsNoticeMedia {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) {
    return { kind: 'none' };
  }

  const url = parseHttpsUrl(trimmed);
  if (!url) {
    return { kind: 'none' };
  }

  if (RASTER_PATHNAME.test(url.pathname)) {
    return { kind: 'photo', photoUrl: trimmed };
  }

  const itemId = parseArcGisStoryMapItemId(url);
  if (itemId) {
    return {
      kind: 'storymap',
      externalHref: `https://storymaps.arcgis.com/stories/${itemId}`,
      thumbnailUrl: arcGisStoryMapCoverUrl(itemId),
    };
  }

  return { kind: 'external', externalHref: trimmed };
}

/** Hide a derived StoryMap thumbnail if ArcGIS returns 404. */
export function hideBrokenNoticeThumbnail(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLImageElement) {
    target.hidden = true;
  }
}
