import { describe, expect, it } from 'vitest';
import { isAmplifyAuthFailure, readStaffAuthErrorMessage } from './staff-auth-error';

describe('staff-auth-error', () => {
  it('reads AuthError messages', () => {
    const error = new Error('Incorrect username or password.');
    error.name = 'NotAuthorizedException';
    expect(readStaffAuthErrorMessage(error, 'fallback')).toContain('Incorrect username');
  });

  it('maps FORCE_CHANGE_PASSWORD reset guidance', () => {
    const error = new Error('User password cannot be reset in the current state.');
    error.name = 'NotAuthorizedException';
    expect(readStaffAuthErrorMessage(error, 'fallback')).toContain('temporary password from IT');
  });

  it('maps expired verification codes', () => {
    const error = new Error('Invalid code provided, please request a code again.');
    error.name = 'ExpiredCodeException';
    expect(readStaffAuthErrorMessage(error, 'fallback')).toContain('expired');
  });
});
