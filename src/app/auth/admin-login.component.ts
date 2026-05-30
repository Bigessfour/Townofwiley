import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SiteLanguageService } from '../site-language';
import { StaffAuthService } from './staff-auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [AmplifyAuthenticatorModule, CardModule, ButtonModule, MessageModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(StaffAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly siteLanguage = inject(SiteLanguageService);

  protected readonly loadError = signal<string | null>(null);

  protected readonly copy = () => {
    const es = this.siteLanguage.currentLanguage() === 'es';
    return {
      kicker: es ? 'Acceso del personal' : 'Staff access',
      title: es ? 'Iniciar sesion — administracion' : 'Sign in — Town admin',
      body: es
        ? 'Use su cuenta de personal del pueblo para ver actualizaciones de contacto de residentes y herramientas del CMS.'
        : 'Use your Town staff account to view resident contact updates and CMS tools.',
      returnHome: es ? 'Volver al sitio publico' : 'Return to public site',
      authError: es
        ? 'No se pudo completar el inicio de sesion. Verifique su cuenta de personal.'
        : 'Sign-in could not be completed. Verify your staff account.',
    };
  };

  constructor() {
    void this.redirectIfAlreadyStaff();
  }

  protected async onAuthenticated(): Promise<void> {
    this.loadError.set(null);
    try {
      await this.auth.refreshSession();
      if (!this.auth.isStaff()) {
        await this.auth.signOutStaff();
        this.loadError.set(this.copy().authError);
        return;
      }
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
      await this.router.navigateByUrl(returnUrl);
    } catch {
      this.loadError.set(this.copy().authError);
    }
  }

  private async redirectIfAlreadyStaff(): Promise<void> {
    try {
      await this.auth.refreshSession();
      if (this.auth.isStaff()) {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin';
        await this.router.navigateByUrl(returnUrl);
      }
    } catch {
      this.loadError.set(this.copy().authError);
    }
  }
}
