import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { APP_COPY } from './app-copy';
import { LoggingService } from './logging.service';
import { SiteLanguageService } from './site-language';
import { SiteThemeService } from './site-theme';

@Component({
  selector: 'app-theme-toggle',
  imports: [ButtonModule],
  template: `
    @if (isDark()) {
      <button
        type="button"
        pButton
        class="theme-toggle-btn"
        icon="pi pi-sun"
        [rounded]="true"
        [attr.aria-label]="label()"
        aria-pressed="true"
        [attr.data-testid]="testId()"
        (click)="toggle()"
      ></button>
    } @else {
      <button
        type="button"
        pButton
        class="theme-toggle-btn"
        icon="pi pi-moon"
        [rounded]="true"
        [attr.aria-label]="label()"
        aria-pressed="false"
        [attr.data-testid]="testId()"
        (click)="toggle()"
      ></button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }

    :host ::ng-deep .theme-toggle-btn.p-button {
      width: 2.75rem;
      min-width: 2.75rem;
      min-height: 2.75rem;
      padding: 0;
      color: var(--wiley-header-control-text);
      background: var(--wiley-header-control-bg);
      border: 1px solid var(--wiley-header-control-border);
    }

    :host ::ng-deep .theme-toggle-btn.p-button .p-button-icon {
      color: var(--wiley-header-control-text);
    }

    :host ::ng-deep .theme-toggle-btn.p-button:hover {
      color: var(--wiley-header-control-text);
      background: var(--wiley-header-control-bg);
      border-color: var(--wiley-header-action-bg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  readonly testId = input('theme-toggle');

  private readonly siteTheme = inject(SiteThemeService);
  private readonly siteLanguage = inject(SiteLanguageService);
  private readonly logging = inject(LoggingService);

  protected readonly isDark = this.siteTheme.isDark;
  protected readonly label = computed(() => {
    const copy = APP_COPY[this.siteLanguage.currentLanguage() || 'en'];
    return this.isDark() ? copy.themeToLightLabel : copy.themeToDarkLabel;
  });

  protected toggle(): void {
    this.logging.buttonClick(this.isDark() ? 'theme-light' : 'theme-dark');
    this.siteTheme.toggle();
  }
}
