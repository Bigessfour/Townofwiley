import { describe, expect, it } from 'vitest';
import { AdminLoginComponent } from './admin-login.component';
import { sanitizeStaffReturnUrl } from './staff-return-url';

describe('sanitizeStaffReturnUrl', () => {
  it('defaults to /admin', () => {
    expect(sanitizeStaffReturnUrl(null)).toBe('/admin');
    expect(sanitizeStaffReturnUrl('')).toBe('/admin');
  });

  it('allows same-origin relative paths and hashes', () => {
    expect(sanitizeStaffReturnUrl('/admin#documents')).toBe('/admin#documents');
    expect(sanitizeStaffReturnUrl('/admin?task=post-notice')).toBe('/admin?task=post-notice');
  });

  it('rejects absolute and protocol-relative URLs', () => {
    expect(sanitizeStaffReturnUrl('https://evil.example/phish')).toBe('/admin');
    expect(sanitizeStaffReturnUrl('//evil.example/phish')).toBe('/admin');
    expect(sanitizeStaffReturnUrl('/\\evil.example')).toBe('/admin');
  });
});

describe('AdminLoginComponent', () => {
  it('exports the staff login surface', () => {
    expect(AdminLoginComponent.name).toBe('AdminLoginComponent');
  });
});
