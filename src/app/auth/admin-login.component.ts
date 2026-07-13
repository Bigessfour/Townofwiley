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
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ADMIN_LOGIN_COPY } from './admin-login-copy';
import { readStaffAuthErrorMessage } from './staff-auth-error';
import { StaffAuthService } from './staff-auth.service';

const AUTO_REDIRECT_DELAY_MS = 300;

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ButtonModule, MessageModule, RouterLink],
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
  protected readonly showManualSignIn = signal(false);
  protected readonly copy = ADMIN_LOGIN_COPY;

  private hubStop?: () => void;
  private fragmentSubscription?: { unsubscribe: () => void };
  private redirectTimer?: ReturnType<typeof setTimeout>;
  private redirectStarted = false;
  private navigationStarted = false;

  ngOnInit(): void {
    this.hubStop = Hub.listen('auth', (message) => {
      const { event } = message.payload;
      const data = 'data' in message.payload ? (message.payload.data as unknown) : undefined;
      void this.handleAuthHubEvent(event, data);
    });
    this.syncNewStaffGuideState();
    this.fragmentSubscription = this.route.fragment.subscribe(() => {
      this.syncNewStaffGuideState();
      this.cdr.markForCheck();
    });
    void this.runLoginFlow();
  }

  ngOnDestroy(): void {
    this.hubStop?.();
    this.fragmentSubscription?.unsubscribe();
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  }

  protected startHostedSignIn(): void {
    this.showManualSignIn.set(false);
    this.redirectStarted = false;
    this.statusMessage.set(this.copy.redirectingLabel);
    this.cdr.markForCheck();
    void this.beginHostedSignInRedirect();
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

      if (returningFromHostedUi) {
        this.statusMessage.set(this.copy.completingSignInLabel);
        this.cdr.markForCheck();
        // OAuth listener + Hub also call completeHostedSignIn; service dedupes in-flight work.
        await this.auth.completeHostedSignIn();
        await this.navigateAfterSignIn();
        return;
      }

      if (this.auth.isAuthenticated()) {
        this.statusMessage.set(this.copy.completingSignInLabel);
        this.cdr.markForCheck();
        await this.auth.completeHostedSignIn();
        await this.navigateAfterSignIn();
        return;
      }

      if (this.shouldDeferHostedSignInRedirect()) {
        this.statusMessage.set(null);
        this.showManualSignIn.set(true);
        this.cdr.markForCheck();
        this.scrollToNewStaffGuide();
        return;
      }

      this.statusMessage.set(this.copy.redirectingLabel);
      this.cdr.markForCheck();
      this.scheduleHostedSignInRedirect();
    } catch (error) {
      this.showAuthError(error);
    }
  }

  private shouldDeferHostedSignInRedirect(): boolean {
    return this.route.snapshot.fragment === 'new-staff';
  }

  private syncNewStaffGuideState(): void {
    if (!this.shouldDeferHostedSignInRedirect()) {
      return;
    }
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = undefined;
    }
    this.redirectStarted = false;
    this.showManualSignIn.set(true);
    this.statusMessage.set(null);
    this.scrollToNewStaffGuide();
  }

  private scrollToNewStaffGuide(): void {
    if (typeof document === 'undefined') {
      return;
    }
    queueMicrotask(() => {
      document.getElementById('new-staff')?.scrollIntoView({ block: 'start' });
    });
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
