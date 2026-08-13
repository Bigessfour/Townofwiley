import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ADMIN_LOGIN_COPY } from './admin-login-copy';
import { readStaffAuthErrorMessage, readStaffPasswordResetErrorMessage } from './staff-auth-error';
import { StaffAuthService } from './staff-auth.service';
import { sanitizeStaffReturnUrl } from './staff-return-url';

type LoginStep = 'signIn' | 'newPassword' | 'forgotPassword' | 'confirmReset';

function newPasswordsMatch(group: {
  get: (name: string) => { value: string } | null;
}): ValidationErrors | null {
  const password = group.get('newPassword')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, MessageModule, RouterLink, InputTextModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(StaffAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly loadError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly step = signal<LoginStep>('signIn');
  /** Email used for password reset (carried from forgot → confirm steps). */
  protected readonly resetEmail = signal('');

  protected readonly signInForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly newPasswordForm = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: newPasswordsMatch },
  );

  protected readonly forgotPasswordForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly confirmResetForm = this.fb.nonNullable.group(
    {
      code: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: newPasswordsMatch },
  );

  protected readonly copy = ADMIN_LOGIN_COPY;

  constructor() {
    void this.redirectIfAlreadyStaff();
  }

  protected showForgotPassword(): void {
    this.loadError.set(null);
    this.successMessage.set(null);
    const email = this.signInForm.controls.email.value.trim();
    if (email) {
      this.forgotPasswordForm.patchValue({ email });
    }
    this.step.set('forgotPassword');
    this.cdr.markForCheck();
  }

  protected showSignIn(): void {
    this.loadError.set(null);
    this.successMessage.set(null);
    this.step.set('signIn');
    this.cdr.markForCheck();
  }

  protected async signInViaHosted(): Promise<void> {
    this.loadError.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.cdr.markForCheck();
    try {
      await this.auth.beginStaffHostedSignIn();
      // Browser will redirect; on return the session should be established.
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy.authError));
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async submitSignIn(): Promise<void> {
    if (this.signInForm.invalid || this.submitting()) {
      this.signInForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loadError.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.cdr.markForCheck();
    try {
      const { email, password } = this.signInForm.getRawValue();
      const next = await this.auth.beginStaffSignIn({ username: email, password });
      if (next === 'newPasswordRequired') {
        this.step.set('newPassword');
        return;
      }
      await this.navigateAfterSignIn();
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy.authError));
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async submitNewPassword(): Promise<void> {
    if (this.newPasswordForm.invalid || this.submitting()) {
      this.newPasswordForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loadError.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.cdr.markForCheck();
    try {
      const { newPassword } = this.newPasswordForm.getRawValue();
      await this.auth.completeStaffNewPassword(newPassword);
      await this.navigateAfterSignIn();
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy.authError));
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async submitForgotPassword(): Promise<void> {
    if (this.forgotPasswordForm.invalid || this.submitting()) {
      this.forgotPasswordForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loadError.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.cdr.markForCheck();
    try {
      const { email } = this.forgotPasswordForm.getRawValue();
      await this.auth.requestStaffPasswordReset(email);
      this.resetEmail.set(email.trim());
      this.successMessage.set(this.copy.resetCodeSent);
      this.step.set('confirmReset');
    } catch (error) {
      this.loadError.set(readStaffPasswordResetErrorMessage(error, this.copy.resetError));
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }

  protected async submitConfirmReset(): Promise<void> {
    if (this.confirmResetForm.invalid || this.submitting()) {
      this.confirmResetForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loadError.set(null);
    this.successMessage.set(null);
    this.submitting.set(true);
    this.cdr.markForCheck();
    try {
      const { code, newPassword } = this.confirmResetForm.getRawValue();
      await this.auth.confirmStaffPasswordReset({
        username: this.resetEmail(),
        confirmationCode: code,
        newPassword,
      });
      this.signInForm.patchValue({ email: this.resetEmail(), password: '' });
      this.confirmResetForm.reset();
      this.successMessage.set(this.copy.resetComplete);
      this.step.set('signIn');
    } catch (error) {
      this.loadError.set(readStaffPasswordResetErrorMessage(error, this.copy.resetError));
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }

  private async navigateAfterSignIn(): Promise<void> {
    await this.router.navigateByUrl(
      sanitizeStaffReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
    );
  }

  private async redirectIfAlreadyStaff(): Promise<void> {
    try {
      await this.auth.refreshSession();
      if (this.auth.isStaff()) {
        await this.navigateAfterSignIn();
      }
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy.authError));
    } finally {
      this.cdr.markForCheck();
    }
  }
}
