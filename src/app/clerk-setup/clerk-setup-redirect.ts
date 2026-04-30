import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-clerk-setup-redirect',
  template: '<p class="sr-only">Redirecting to the CMS Admin Hub.</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClerkSetupRedirect {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    queueMicrotask(() => {
      void this.router.navigate(['/admin'], {
        fragment: this.route.snapshot.fragment ?? undefined,
        replaceUrl: true,
      });
    });
  }
}
