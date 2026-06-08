import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Hub } from 'aws-amplify/utils';
import { MessageModule } from 'primeng/message';
import { ADMIN_LOGIN_COPY } from './admin-login-copy';
import { readStaffAuthErrorMessage } from './staff-auth-error';
import { StaffAuthService } from './staff-auth.service';

const AUTO_REDIRECT_DELAY_MS = 300;

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [MessageModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent implements OnInit, OnDestroy {
  private readonly auth = inject(StaffAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly loadError = signal<string | null>(null);
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly showRetrySignIn = signal(false);
  protected readonly copy = ADMIN_LOGIN_COPY;

  private hubStop?: () => void;
  private redirectTimer?: ReturnType<typeof setTimeout>;
  private redirectStarted = false;
  private navigationStarted = false;

  ngOnInit(): void {
    this.hubStop = Hub.listen('auth', ({ payload }) => {
      void this.handleAuthHubEvent(payload.event, payload.data);
    });
    void this.runLoginFlow();
  }

  ngOnDestroy(): void {
    this.hubStop?.();
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  protected retrySignIn(): void {
    this.loadError.set(null);
    this.showRetrySignIn.set(false);
    this.redirectStarted = false;
    void this.runLoginFlow();
  }

  private async handleAuthHubEvent(event: string, data: unknown): Promise<void> {
    switch (event) {
      case 'signInWithRedirect':
        await this.completeAndNavigate();
        break;
      case 'signInWithRedirect_failure':
        this.showAuthError(data);
        break;
      default:
        break;
    }
  }

  private async runLoginFlow(): Promise<void> {
    if (this.navigationStarted) {
      return;
    }

    this.loadError.set(null);
    this.showRetrySignIn.set(false);

    try {
      const returningFromHostedUi = this.auth.isHostedSignInCallback();
      await this.auth.waitForAuthenticatedSession(returningFromHostedUi ? 10 : 3);

      if (this.auth.isStaff()) {
        await this.navigateAfterSignIn();
        return;
      }

      if (returningFromHostedUi || this.auth.isAuthenticated()) {
        this.statusMessage.set(this.copy.completingSignInLabel);
        this.cdr.markForCheck();
        await this.auth.completeHostedSignIn();
        await this.navigateAfterSignIn();
        return;
      }

      this.statusMessage.set(this.copy.redirectingLabel);
      this.cdr.markForCheck();
      this.scheduleHostedSignInRedirect();
    } catch (error) {
      this.showAuthError(error);
    }
  }

  private scheduleHostedSignInRedirect(): void {
    if (this.redirectStarted) {
      return;
    }
    this.redirectStarted = true;
    this.redirectTimer = setTimeout(() => {
      void this.beginHostedSignInRedirect();
    }, AUTO_REDIRECT_DELAY_MS);
  }

  private async beginHostedSignInRedirect(): Promise<void> {
    if (this.navigationStarted) {
      return;
    }

    try {
      await this.auth.beginStaffHostedSignIn();
      if (this.auth.isStaff()) {
        await this.navigateAfterSignIn();
      }
    } catch (error) {
      this.showAuthError(error);
    }
  }

  private async completeAndNavigate(): Promise<void> {
    if (this.navigationStarted) {
      return;
    }

    this.statusMessage.set(this.copy.completingSignInLabel);
    this.cdr.markForCheck();

    try {
      await this.auth.completeHostedSignIn();
      await this.navigateAfterSignIn();
    } catch (error) {
      this.showAuthError(error);
    }
  }

  private showAuthError(error: unknown): void {
    this.loadError.set(readStaffAuthErrorMessage(error, this.copy.authError));
    this.statusMessage.set(null);
    this.showRetrySignIn.set(true);
    this.cdr.markForCheck();
  }

  private async navigateAfterSignIn(): Promise<void> {
    if (this.navigationStarted) {
      return;
    }
    this.navigationStarted = true;

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
    await this.router.navigateByUrl(returnUrl);
  }
}