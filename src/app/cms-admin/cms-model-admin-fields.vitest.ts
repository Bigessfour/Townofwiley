import { describe, expect, it } from 'vitest';
import {
  cmsCreateMutationField,
  cmsListQueryField,
  cmsRecordSummaryLabel,
  cmsUpdateMutationField,
} from './cms-model-admin-fields';

describe('cms-model-admin-fields', () => {
  it('maps irregular AppSync list and mutation names', () => {
    expect(cmsListQueryField('SiteSettings')).toBe('listSiteSettings');
    expect(cmsListQueryField('LeadershipRosterEntry')).toBe('listLeadershipRosterEntries');
    expect(cmsCreateMutationField('PublicDocument')).toBe('createPublicDocument');
    expect(cmsUpdateMutationField('ExternalNewsLink')).toBe('updateExternalNewsLink');
  });

  it('summarizes records for clerk pick lists', () => {
    expect(cmsRecordSummaryLabel('OfficialContact', { id: 'city-clerk', label: 'Clerk' })).toBe(
      'Clerk (city-clerk)',
    );
    expect(cmsRecordSummaryLabel('SiteCopy', { key: 'nav.services' })).toBe('nav.services');
  });
});
