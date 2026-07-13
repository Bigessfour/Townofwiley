import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { staffAuthGuard } from './staff-auth.guard';
import { StaffAuthService } from './staff-auth.service';

// Guard awaits ensureAdminRuntimeConfigLoaded() before refreshSession.
// Mock it so Vitest never hangs on a real /runtime-config-admin.js script inject.
vi.mock('../admin-runtime-config', () => ({
  ensureAdminRuntimeConfigLoaded: vi.fn().mockResolvedValue(undefined),
}));

describe('staffAuthGuard', () => {
  const refreshSession = vi.fn();
  const isStaff = vi.fn();
  const createUrlTree = vi.fn(
    (commands: unknown[], extras?: { queryParams?: Record<string, string> }) => {
      return { commands, extras } as unknown as UrlTree;
    },
  );

  beforeEach(() => {
    refreshSession.mockReset();
    isStaff.mockReset();
    createUrlTree.mockClear();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: StaffAuthService,
          useValue: { refreshSession, isStaff },
        },
        {
          provide: Router,
          useValue: { createUrlTree },
        },
      ],
    });
  });

  it('allows staff sessions', async () => {
    refreshSession.mockResolvedValue(undefined);
    isStaff.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      staffAuthGuard({} as never, { url: '/admin' } as never),
    );

    expect(result).toBe(true);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it('redirects unauthenticated users to /admin/login with returnUrl', async () => {
    refreshSession.mockResolvedValue(undefined);
    isStaff.mockReturnValue(false);

    await TestBed.runInInjectionContext(() =>
      staffAuthGuard({} as never, { url: '/admin#updates' } as never),
    );

    expect(createUrlTree).toHaveBeenCalledWith(['/admin/login'], {
      queryParams: { returnUrl: '/admin#updates' },
    });
  });
});
