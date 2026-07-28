import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

/** Legacy `/community-calendar` → unified `/meetings#community`. */
@Component({
  selector: 'app-community-calendar-redirect',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityCalendarRedirect implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.router.navigateByUrl('/meetings#community');
  }
}
