import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

/** Legacy `/notices` → unified `/news` hub, preserving notice fragments. */
export const noticesToNewsGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  return router.createUrlTree(['/news'], {
    fragment: route.fragment ?? undefined,
  });
};
