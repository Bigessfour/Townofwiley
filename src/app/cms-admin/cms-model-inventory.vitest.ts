import { describe, expect, it } from 'vitest';
import { CMS_MODEL_DEFINITIONS, liveCountForModel } from './cms-model-inventory';

describe('cms-model-inventory', () => {
  it('lists all ten Gen 2 CMS models', () => {
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
      'EmailAlias',
    ]);
  });

  it('marks EmailAlias as not public API key read', () => {
    const emailAlias = CMS_MODEL_DEFINITIONS.find((d) => d.model === 'EmailAlias');
    expect(emailAlias?.publicApiKeyRead).toBe(false);
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
    };
    expect(liveCountForModel('Business', counts)).toBe(11);
    expect(liveCountForModel('EmailAlias', counts)).toBeUndefined();
  });
});
