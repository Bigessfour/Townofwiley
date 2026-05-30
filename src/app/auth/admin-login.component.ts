import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { SiteLanguageService } from '../site-language';
import { StaffAuthService } from './staff-auth.service';

type LoginStep = 'signIn' | 'newPassword';

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
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    MessageModule,
    RouterLink,
    InputTextModule,
    PasswordModule,
  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(StaffAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly siteLanguage = inject(SiteLanguageService);
  private readonly fb = inject(FormBuilder);

  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly step = signal<LoginStep>('signIn');

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

  protected readonly copy = () => {
    const es = this.siteLanguage.currentLanguage() === 'es';
    return {
      kicker: es ? 'Acceso del personal' : 'Staff access',
      title: es ? 'Iniciar sesion — administracion' : 'Sign in — Town admin',
      body: es
        ? 'Use su cuenta de personal del pueblo para ver actualizaciones de contacto de residentes y herramientas del CMS.'
        : 'Use your Town staff account to view resident contact updates and CMS tools.',
      emailLabel: es ? 'Correo electronico' : 'Email',
      passwordLabel: es ? 'Contrasena' : 'Password',
      signInLabel: es ? 'Iniciar sesion' : 'Sign in',
      newPasswordHint: es
        ? 'Su cuenta requiere una contrasena nueva. Use la contrasena temporal que le envio IT.'
        : 'Your account requires a new password. Use the temporary password IT sent you, then choose a new one below.',
      newPasswordLabel: es ? 'Contrasena nueva' : 'New password',
      confirmPasswordLabel: es ? 'Confirmar contrasena' : 'Confirm password',
      passwordMismatch: es ? 'Las contrasenas no coinciden.' : 'Passwords do not match.',
      setPasswordLabel: es ? 'Guardar contrasena e ingresar' : 'Save password and continue',
      returnHome: es ? 'Volver al sitio publico' : 'Return to public site',
      authError: es
        ? 'No se pudo completar el inicio de sesion. Verifique su cuenta de personal.'
        : 'Sign-in could not be completed. Verify your staff account and password.',
    };
  };

  constructor() {
    void this.redirectIfAlreadyStaff();
  }

  protected async submitSignIn(): Promise<void> {
    if (this.signInForm.invalid || this.submitting()) {
      this.signInForm.markAllAsTouched();
      return;
    }
    this.loadError.set(null);
    this.submitting.set(true);
    try {
      const { email, password } = this.signInForm.getRawValue();
      const next = await this.auth.beginStaffSignIn({ username: email, password });
      if (next === 'newPasswordRequired') {
        this.step.set('newPassword');
        return;
      }
      await this.navigateAfterSignIn();
    } catch {
      this.loadError.set(this.copy().authError);
    } finally {
      this.submitting.set(false);
    }
  }

  protected async submitNewPassword(): Promise<void> {
    if (this.newPasswordForm.invalid || this.submitting()) {
      this.newPasswordForm.markAllAsTouched();
      return;
    }
    this.loadError.set(null);
    this.submitting.set(true);
    try {
      const { newPassword } = this.newPasswordForm.getRawValue();
      await this.auth.completeStaffNewPassword(newPassword);
      await this.navigateAfterSignIn();
    } catch {
      this.loadError.set(this.copy().authError);
    } finally {
      this.submitting.set(false);
    }
  }

  private async navigateAfterSignIn(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
    await this.router.navigateByUrl(returnUrl);
  }

  private async redirectIfAlreadyStaff(): Promise<void> {
    try {
      await this.auth.refreshSession();
      if (this.auth.isStaff()) {
        await this.navigateAfterSignIn();
      }
    } catch {
      this.loadError.set(this.copy().authError);
    }
  }
}
