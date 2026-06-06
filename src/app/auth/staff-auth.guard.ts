import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StaffAuthService } from './staff-auth.service';

/** Requires Staff Cognito session; sends unauthenticated users to Hosted UI login flow. */
export const staffAuthGuard: CanActivateFn = async (route, state) => {
  const auth = inject(StaffAuthService);
  const router = inject(Router);

  await auth.refreshSession();
  if (auth.isStaff()) {
    return true;
  }

  const returnUrl = state.url || '/admin';
  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl },
  });
};
