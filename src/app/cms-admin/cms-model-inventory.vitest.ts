import { describe, expect, it } from 'vitest';
import {
  CMS_MODEL_DEFINITIONS,
  cmsOrderedEditorConfig,
  liveCountForModel,
} from './cms-model-inventory';

describe('cms-model-inventory', () => {
  it('lists all CMS models tracked in inventory', () => {
    expect(CMS_MODEL_DEFINITIONS.map((d) => d.model)).toEqual([
      'SiteSettings',
      'AlertBanner',
      'Announcement',
      'Event',
      'OfficialContact',
      'LeadershipRosterEntry',
      'Business',
      'PublicDocument',
      'ExternalNewsLink',
      'SiteCopy',
    ]);
  });

  it('flags displayOrder-driven clerk models for ordered editor UI', () => {
    expect(cmsOrderedEditorConfig('LeadershipRosterEntry')).toEqual({
      previewField: 'lineEn',
      sortField: 'displayOrder',
      groupField: 'groupId',
    });
    expect(cmsOrderedEditorConfig('Business')).toEqual({
      previewField: 'name',
      sortField: 'displayOrder',
    });
    expect(cmsOrderedEditorConfig('PublicDocument')).toEqual({
      previewField: 'title',
      sortField: 'displayOrder',
      groupField: 'sectionId',
    });
    expect(cmsOrderedEditorConfig('ExternalNewsLink')).toEqual({
      previewField: 'title',
      sortField: 'displayOrder',
    });
    expect(cmsOrderedEditorConfig('SiteCopy')).toEqual({
      previewField: 'valueEn',
      sortField: 'displayOrder',
      prefixField: 'key',
    });
    expect(cmsOrderedEditorConfig('Announcement')).toBeUndefined();
  });

  it('includes SiteCopy as public API key read for inventory parity', () => {
    const siteCopy = CMS_MODEL_DEFINITIONS.find((d) => d.model === 'SiteCopy');
    expect(siteCopy?.publicApiKeyRead).toBe(true);
    expect(siteCopy?.keyFields).toContain('valueEn');
  });

  it('reads live counts by model name', () => {
    const counts = {
      SiteSettings: 1,
      AlertBanner: 0,
      Announcement: 2,
      Event: 1,
      OfficialContact: 2,
      LeadershipRosterEntry: 0,
      Business: 11,
      PublicDocument: 0,
      ExternalNewsLink: 2,
      SiteCopy: 3,
    };
    expect(liveCountForModel('Business', counts)).toBe(11);
    expect(liveCountForModel('SiteCopy', counts)).toBe(3);
    expect(liveCountForModel('Announcement', counts)).toBe(2);
  });
});
