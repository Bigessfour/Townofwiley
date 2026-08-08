/** Symbol smoke — shell covered by e2e admin.cms.spec.ts. */
import { describe, expect, it } from 'vitest';
import { CmsAdmin } from './cms-admin';

describe('CmsAdmin', () => {
  it('exports the admin shell surface', () => {
    expect(CmsAdmin.name).toBe('CmsAdmin');
  });
});
