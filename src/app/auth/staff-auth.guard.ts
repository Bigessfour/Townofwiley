import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StaffAuthService } from './staff-auth.service';

export const staffAuthGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(StaffAuthService);
  const router = inject(Router);

  await auth.refreshSession();

  if (auth.isStaff()) {
    return true;
  }

  return router.createUrlTree(['/admin/login'], {
    queryParams: { returnUrl: state.url },
  });
};
