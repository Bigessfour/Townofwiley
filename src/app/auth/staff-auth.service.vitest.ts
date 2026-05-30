import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAuthSession = vi.fn();
const getCurrentUser = vi.fn();
const confirmSignIn = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();

vi.mock('aws-amplify/auth', () => ({
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
}));

describe('StaffAuthService', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchAuthSession.mockReset();
    getCurrentUser.mockReset();
    confirmSignIn.mockReset();
    signIn.mockReset();
    signOut.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('marks staff when cognito:groups includes Staff', async () => {
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { toString: () => 'access-token', payload: {} },
        idToken: { payload: { 'cognito:groups': ['Staff'] } },
      },
    });
    getCurrentUser.mockResolvedValue({
      username: 'clerk@town.gov',
      signInDetails: { loginId: 'clerk@town.gov' },
    });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.refreshSession();

    expect(service.isStaff()).toBe(true);
    expect(service.accessToken()).toBe('access-token');
  });

  it('returns newPasswordRequired when Cognito requires a password change', async () => {
    signIn.mockResolvedValue({
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
    });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    const step = await service.beginStaffSignIn({
      username: 'clerk@town.gov',
      password: 'TempPass1!',
    });

    expect(step).toBe('newPasswordRequired');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('completes sign-in after confirmSignIn for new password', async () => {
    confirmSignIn.mockResolvedValue({ nextStep: { signInStep: 'DONE' } });
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { toString: () => 'access-token', payload: {} },
        idToken: { payload: { 'cognito:groups': ['Staff'] } },
      },
    });
    getCurrentUser.mockResolvedValue({ username: 'clerk@town.gov' });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.completeStaffNewPassword('NewSecurePass1!');

    expect(confirmSignIn).toHaveBeenCalledWith({ challengeResponse: 'NewSecurePass1!' });
    expect(service.isStaff()).toBe(true);
  });

  it('rejects non-staff authenticated users', async () => {
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { toString: () => 'access-token', payload: {} },
        idToken: { payload: { 'cognito:groups': ['Residents'] } },
      },
    });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.refreshSession();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.isStaff()).toBe(false);
  });
});
