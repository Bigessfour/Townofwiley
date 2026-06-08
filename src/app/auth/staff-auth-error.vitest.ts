import { describe, expect, it } from 'vitest';
import {
  isAmplifyAuthFailure,
  isUserAlreadyAuthenticatedError,
  readStaffAuthErrorMessage,
} from './staff-auth-error';

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

  it('detects Amplify auth failures', () => {
    const error = new Error('Incorrect username or password.');
    error.name = 'NotAuthorizedException';
    expect(isAmplifyAuthFailure(error)).toBe(true);
  });

  it('detects UserAlreadyAuthenticatedException', () => {
    const error = Object.assign(new Error('There is already a signed in user.'), {
      name: 'UserAlreadyAuthenticatedException',
    });

    expect(isUserAlreadyAuthenticatedError(error)).toBe(true);
    expect(readStaffAuthErrorMessage(error, 'fallback')).toContain('previous sign-in session');
  });
});
