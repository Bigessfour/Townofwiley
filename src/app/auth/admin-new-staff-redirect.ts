import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Shareable entry for first-time staff access instructions (→ /admin/login#new-staff). */
@Component({
  selector: 'app-admin-new-staff-redirect',
  template: `
    <main id="main-content" class="admin-new-staff-redirect" tabindex="-1">
      <p role="status">Redirecting to first-time staff access…</p>
      <p><a href="/admin/login#new-staff">Continue to staff access instructions</a></p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminNewStaffRedirect {
  private readonly router = inject(Router);

  constructor() {
    queueMicrotask(() => {
      void this.router.navigate(['/admin/login'], {
        fragment: 'new-staff',
        replaceUrl: true,
      });
    });
  }
}