import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Placeholder for the `/` route. The bootstrapped `App` component owns the public homepage;
 * this empty outlet child avoids nesting a second `App` instance (which broke `/admin` E2E).
 */
@Component({
  selector: 'app-home-route-shell',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeRouteShell {}
