import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAuthSession = vi.fn();
const getCurrentUser = vi.fn();
const confirmResetPassword = vi.fn();
const confirmSignIn = vi.fn();
const resetPassword = vi.fn();
const signIn = vi.fn();
const signInWithRedirect = vi.fn();
const signOut = vi.fn();

vi.mock('aws-amplify/auth', () => ({
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  signIn,
  signInWithRedirect,
  signOut,
}));

describe('StaffAuthService', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchAuthSession.mockReset();
    getCurrentUser.mockReset();
    confirmResetPassword.mockReset();
    confirmSignIn.mockReset();
    resetPassword.mockReset();
    signIn.mockReset();
    signInWithRedirect.mockReset();
    signOut.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('marks staff when cognito:groups is only on the access token', async () => {
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: {
          toString: () => 'access-token',
          payload: { 'cognito:groups': ['Staff'] },
        },
        idToken: { payload: {} },
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

  it('redirects to Cognito Hosted UI when no session exists', async () => {
    fetchAuthSession.mockResolvedValue({ tokens: undefined });
    signInWithRedirect.mockResolvedValue(undefined);

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.beginStaffHostedSignIn();

    expect(signInWithRedirect).toHaveBeenCalledTimes(1);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('skips redirect when the session is already staff', async () => {
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { toString: () => 'access-token', payload: {} },
        idToken: { payload: { 'cognito:groups': ['Staff'] } },
      },
    });
    getCurrentUser.mockResolvedValue({ username: 'clerk@town.gov' });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.beginStaffHostedSignIn();

    expect(signInWithRedirect).not.toHaveBeenCalled();
  });

  it('signs out a stale non-staff session before redirecting', async () => {
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { toString: () => 'access-token', payload: {} },
        idToken: { payload: { 'cognito:groups': ['Residents'] } },
      },
    });
    signOut.mockResolvedValue(undefined);
    signInWithRedirect.mockResolvedValue(undefined);

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.beginStaffHostedSignIn();

    expect(signOut).toHaveBeenCalledWith({ global: true });
    expect(signInWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('recovers from UserAlreadyAuthenticatedException during hosted sign-in', async () => {
    fetchAuthSession.mockResolvedValue({ tokens: undefined });
    signInWithRedirect
      .mockRejectedValueOnce(
        Object.assign(new Error('There is already a signed in user.'), {
          name: 'UserAlreadyAuthenticatedException',
        }),
      )
      .mockResolvedValueOnce(undefined);
    signOut.mockResolvedValue(undefined);

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.beginStaffHostedSignIn();

    expect(signOut).toHaveBeenCalledWith({ global: true });
    expect(signInWithRedirect).toHaveBeenCalledTimes(2);
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

  it('requests password reset when Cognito returns confirm step', async () => {
    resetPassword.mockResolvedValue({
      isPasswordReset: false,
      nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
    });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.requestStaffPasswordReset('clerk@town.gov');

    expect(resetPassword).toHaveBeenCalledWith({ username: 'clerk@town.gov' });
  });

  it('confirms password reset with code and new password', async () => {
    confirmResetPassword.mockResolvedValue(undefined);

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.confirmStaffPasswordReset({
      username: 'clerk@town.gov',
      confirmationCode: '123456',
      newPassword: 'NewSecurePass1!',
    });

    expect(confirmResetPassword).toHaveBeenCalledWith({
      username: 'clerk@town.gov',
      confirmationCode: '123456',
      newPassword: 'NewSecurePass1!',
    });
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

  it('retries until Staff group appears after hosted OAuth callback', async () => {
    fetchAuthSession
      .mockResolvedValueOnce({
        tokens: {
          accessToken: { toString: () => 'access-token', payload: {} },
          idToken: { payload: {} },
        },
      })
      .mockResolvedValueOnce({
        tokens: {
          accessToken: { toString: () => 'access-token', payload: {} },
          idToken: { payload: {} },
        },
      })
      .mockResolvedValueOnce({
        tokens: {
          accessToken: { toString: () => 'access-token', payload: {} },
          idToken: { payload: {} },
        },
      })
      .mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'access-token',
            payload: { 'cognito:groups': ['Staff'] },
          },
          idToken: { payload: { 'cognito:groups': ['Staff'] } },
        },
      });
    getCurrentUser.mockResolvedValue({ username: 'clerk@town.gov' });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.completeHostedSignIn();

    expect(fetchAuthSession.mock.calls.some((call) => call[0]?.forceRefresh === true)).toBe(true);
    expect(service.isStaff()).toBe(true);
  });

  it('completes hosted sign-in when Staff group is present on first token read', async () => {
    fetchAuthSession.mockResolvedValue({
      tokens: {
        accessToken: { toString: () => 'access-token', payload: {} },
        idToken: { payload: { 'cognito:groups': ['Staff'] } },
      },
    });
    getCurrentUser.mockResolvedValue({ username: 'clerk@town.gov' });

    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();
    await service.completeHostedSignIn();

    expect(service.isStaff()).toBe(true);
  });

  it('detects OAuth callback query parameters', async () => {
    const { StaffAuthService } = await import('./staff-auth.service');
    const service = new StaffAuthService();

    vi.stubGlobal('window', {
      location: { search: '?code=abc&state=xyz' },
    } as Window);

    expect(service.isHostedSignInCallback()).toBe(true);
    vi.unstubAllGlobals();
  });
});
