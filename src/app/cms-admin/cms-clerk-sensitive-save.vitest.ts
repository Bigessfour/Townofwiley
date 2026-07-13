import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  confirmClerkSensitiveSave,
  confirmEmailAliasSave,
  confirmMeetingDocumentUpload,
} from './cms-clerk-sensitive-save';

describe('cms-clerk-sensitive-save', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('confirmClerkSensitiveSave prompts when enabling emergency banner', () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    const ok = confirmClerkSensitiveSave('emergency-banner', { enabled: true });
    expect(ok).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('confirmClerkSensitiveSave prompts when hiding a notice', () => {
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirm);
    const ok = confirmClerkSensitiveSave('post-notice', { active: false });
    expect(ok).toBe(false);
  });

  it('confirmEmailAliasSave describes alias and destination', () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    expect(confirmEmailAliasSave('clerk@townofwiley.gov', 'deb@example.com')).toBe(true);
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('clerk@townofwiley.gov'));
  });

  it('confirmMeetingDocumentUpload includes meeting and file', () => {
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', confirm);
    confirmMeetingDocumentUpload('Town Council', 'agenda.pdf');
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('agenda.pdf'));
  });
});