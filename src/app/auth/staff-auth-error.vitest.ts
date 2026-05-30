import { describe, expect, it } from 'vitest';
import { isAmplifyAuthFailure, readStaffAuthErrorMessage } from './staff-auth-error';

describe('staff-auth-error', () => {
  it('reads AuthError messages', () => {
    const error = new Error('Incorrect username or password.');
    error.name = 'NotAuthorizedException';
    expect(readStaffAuthErrorMessage(error, 'fallback')).toContain('Incorrect username');
  });

  it('detects Amplify auth failures', () => {
    const error = new Error('Incorrect username or password.');
    error.name = 'NotAuthorizedException';
    expect(isAmplifyAuthFailure(error)).toBe(true);
  });
});
