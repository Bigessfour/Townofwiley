import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { ADMIN_LOGIN_COPY } from './admin-login-copy';
import { readStaffAuthErrorMessage } from './staff-auth-error';
import { StaffAuthService } from './staff-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [MessageModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(StaffAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly loadError = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly copy = ADMIN_LOGIN_COPY;

  constructor() {
    void this.runLoginFlow();
  }

  private async runLoginFlow(): Promise<void> {
    this.loadError.set(null);
    try {
      await this.auth.refreshSession();

      if (this.auth.isStaff()) {
        await this.navigateAfterSignIn();
        return;
      }

      if (this.auth.isHostedSignInCallback()) {
        this.statusMessage.set(this.copy.completingSignInLabel);
        this.cdr.markForCheck();
        await this.auth.completeHostedSignIn();
        await this.navigateAfterSignIn();
        return;
      }

      this.statusMessage.set(this.copy.redirectingLabel);
      this.cdr.markForCheck();
      await this.auth.beginStaffHostedSignIn();
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy.authError));
      this.statusMessage.set(null);
      this.cdr.markForCheck();
    }
  }

  private async navigateAfterSignIn(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
    await this.router.navigateByUrl(returnUrl);
  }
}
