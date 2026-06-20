import { Injectable, computed, inject, signal } from '@angular/core';
import { StaffAuthService } from '../auth/staff-auth.service';

/**
 * Staff preview: append `?preview=1` on public routes while signed in to include inactive CMS rows.
 * See docs/cms-preview-mode.md.
 */
@Injectable({ providedIn: 'root' })
export class CmsPreviewModeService {
  private readonly staffAuth = inject(StaffAuthService);
  private readonly queryFlag = signal(false);

  readonly isQueryRequested = computed(() => this.queryFlag());

  readonly isEnabled = computed(
    () =>
      this.queryFlag() &&
      (this.staffAuth.isStaff() || this.staffAuth.playwrightStaffBypassActive()),
  );

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    this.queryFlag.set(params.get('preview') === '1');
  }
}
