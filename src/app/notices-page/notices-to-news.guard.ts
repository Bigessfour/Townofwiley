import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

/** Legacy `/notices` → unified `/news` hub, preserving query (e.g. `?preview=1`) and fragments. */
export const noticesToNewsGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  return router.createUrlTree(['/news'], {
    queryParams: route.queryParams,
    fragment: route.fragment ?? undefined,
  });
};
