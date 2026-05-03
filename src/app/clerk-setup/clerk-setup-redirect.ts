import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-clerk-setup-redirect',
  template: `
    <main id="main-content" class="clerk-setup-redirect" tabindex="-1" aria-labelledby="clerk-setup-redirect-title">
      <p class="clerk-setup-redirect__eyebrow">Legacy clerk setup</p>
      <h1 id="clerk-setup-redirect-title">Redirecting to the CMS admin hub</h1>
      <p>
        The old /clerk-setup path now routes through /admin. The link below keeps your current
        fragment so direct links still open the right CMS tab.
      </p>
      <p>
        <a class="clerk-setup-redirect__link" [href]="adminHref">Open the CMS admin hub now</a>
      </p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClerkSetupRedirect {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly adminHref: string;

  constructor() {
    const fragment = this.route.snapshot.fragment ?? undefined;
    this.adminHref = fragment ? `/admin#${fragment}` : '/admin';

    queueMicrotask(() => {
      void this.router.navigate(['/admin'], {
        fragment,
        replaceUrl: true,
      });
    });
  }
}
