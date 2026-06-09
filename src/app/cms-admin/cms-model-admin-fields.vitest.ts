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
    expect(cmsListQueryField('EmailAlias')).toBe('listEmailAliases');
    expect(cmsCreateMutationField('PublicDocument')).toBe('createPublicDocument');
    expect(cmsCreateMutationField('EmailAlias')).toBe('createEmailAlias');
    expect(cmsUpdateMutationField('ExternalNewsLink')).toBe('updateExternalNewsLink');
    expect(cmsUpdateMutationField('EmailAlias')).toBe('updateEmailAlias');
  });

  it('summarizes records for clerk pick lists', () => {
    expect(cmsRecordSummaryLabel('OfficialContact', { id: 'city-clerk', label: 'Clerk' })).toBe(
      'Clerk (city-clerk)',
    );
    expect(cmsRecordSummaryLabel('SiteCopy', { key: 'nav.services' })).toBe('nav.services');
    expect(
      cmsRecordSummaryLabel('EmailAlias', { aliasAddress: 'clerk@townofwiley.gov' }),
    ).toBe('clerk@townofwiley.gov');
  });
});