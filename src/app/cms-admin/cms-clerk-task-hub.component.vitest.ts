/** Symbol smoke — hub is covered by e2e admin.cms.spec.ts against CLERK-CMS-GUIDE task cards. */
import { describe, expect, it } from 'vitest';
import { CmsClerkTaskHubComponent } from './cms-clerk-task-hub.component';

describe('CmsClerkTaskHubComponent', () => {
  it('exports the clerk task hub surface', () => {
    expect(CmsClerkTaskHubComponent.name).toBe('CmsClerkTaskHubComponent');
  });
});
