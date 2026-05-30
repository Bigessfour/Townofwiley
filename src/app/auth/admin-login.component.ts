import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SiteLanguageService } from '../site-language';
import { readStaffAuthErrorMessage } from './staff-auth-error';
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
  imports: [ReactiveFormsModule, MessageModule, RouterLink, InputTextModule],
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
  private readonly cdr = inject(ChangeDetectorRef);

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
        ? 'Use la cuenta de personal que le dio el pueblo (correo y contrasena). El formulario de inicio de sesion esta debajo de estas instrucciones.'
        : 'Use the Town staff account IT gave you (email and password). The sign-in form is below these instructions.',
      howToHeading: es ? 'Como iniciar sesion' : 'How to sign in',
      howToSteps: es
        ? [
            'Abra este enlace en un navegador actualizado: townofwiley.gov/admin/login',
            'Ingrese su correo de personal del pueblo y su contrasena en el formulario.',
            'Si es su primer acceso, use la contrasena temporal que le envio IT; el sitio le pedira una contrasena nueva.',
            'Despues de iniciar sesion, abra Administracion en townofwiley.gov/admin para CMS y actualizaciones de contacto.',
          ]
        : [
            'Use a current browser at townofwiley.gov/admin/login (bookmark this page).',
            'Enter your Town staff email and password in the form below.',
            'First-time sign-in: use the temporary password from IT; you will be prompted to set a new password.',
            'After sign-in, open the admin hub at townofwiley.gov/admin for CMS tools and contact updates.',
          ],
      helpText: es
        ? 'Si no tiene cuenta o olvido su contrasena, llame a la Oficina del Ayuntamiento al (719) 829-4974 para que IT la ayude.'
        : 'If you do not have an account or forgot your password, call Town Hall at (719) 829-4974 so IT can help.',
      emailLabel: es ? 'Correo electronico' : 'Email',
      passwordLabel: es ? 'Contrasena' : 'Password',
      signInLabel: es ? 'Iniciar sesion' : 'Sign in',
      signingInLabel: es ? 'Iniciando sesion…' : 'Signing in…',
      signInFormLabel: es ? 'Inicio de sesion del personal' : 'Staff sign-in',
      newPasswordFormLabel: es ? 'Establecer contrasena nueva' : 'Set new password',
      newPasswordHint: es
        ? 'Su cuenta requiere una contrasena nueva. Use la contrasena temporal que le envio IT.'
        : 'Your account requires a new password. Use the temporary password IT sent you, then choose a new one below.',
      newPasswordLabel: es ? 'Contrasena nueva' : 'New password',
      confirmPasswordLabel: es ? 'Confirmar contrasena' : 'Confirm password',
      passwordMismatch: es ? 'Las contrasenas no coinciden.' : 'Passwords do not match.',
      setPasswordLabel: es ? 'Guardar contrasena e ingresar' : 'Save password and continue',
      returnHome: es ? 'Volver al sitio publico' : 'Return to public site',
      adminHubLabel: es ? 'Ir a administracion (requiere sesion)' : 'Go to admin hub (requires sign-in)',
      authError: es
        ? 'No se pudo completar el inicio de sesion. Verifique su correo, contrasena temporal o nueva contrasena.'
        : 'Sign-in could not be completed. Check your email, temporary password, or new password.',
    };
  };

  constructor() {
    void this.redirectIfAlreadyStaff();
  }

  protected async submitSignIn(): Promise<void> {
    if (this.signInForm.invalid || this.submitting()) {
      this.signInForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    this.loadError.set(null);
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
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy().authError));
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
    this.submitting.set(true);
    this.cdr.markForCheck();
    try {
      const { newPassword } = this.newPasswordForm.getRawValue();
      await this.auth.completeStaffNewPassword(newPassword);
      await this.navigateAfterSignIn();
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy().authError));
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
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
    } catch (error) {
      this.loadError.set(readStaffAuthErrorMessage(error, this.copy().authError));
    } finally {
      this.cdr.markForCheck();
    }
  }
}
