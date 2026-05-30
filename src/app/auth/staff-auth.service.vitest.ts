import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchAuthSession = vi.fn();
const getCurrentUser = vi.fn();
const signIn = vi.fn();
const signOut = vi.fn();

vi.mock('aws-amplify/auth', () => ({
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
