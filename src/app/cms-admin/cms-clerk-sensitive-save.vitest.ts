import { describe, expect, it, vi } from 'vitest';
import {
  confirmClerkSensitiveSave,
  confirmMeetingDocumentUpload,
} from './cms-clerk-sensitive-save';

describe('confirmClerkSensitiveSave', () => {
  it('does not prompt for a normal active post-notice save', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(confirmClerkSensitiveSave('post-notice', { active: true, title: 'Hi' })).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('prompts when hiding a notice from the public site', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(confirmClerkSensitiveSave('post-notice', { active: false })).toBe(false);
    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });
});

describe('confirmMeetingDocumentUpload', () => {
  it('asks the clerk to confirm publish details', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    expect(confirmMeetingDocumentUpload('Council', 'agenda.pdf')).toBe(true);
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/Council/);
    expect(confirmSpy.mock.calls[0]?.[0]).toMatch(/agenda\.pdf/);
    confirmSpy.mockRestore();
  });
});
