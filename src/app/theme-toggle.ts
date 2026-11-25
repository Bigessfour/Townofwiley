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
        [text]="true"
        severity="contrast"
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
        [text]="true"
        severity="contrast"
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

    .theme-toggle-btn {
      width: 2.75rem;
      min-width: 2.75rem;
      min-height: 2.75rem;
      padding: 0;
      color: var(--wiley-header-text);
      background: color-mix(in srgb, var(--wiley-inverse) 12%, transparent);
      border: 1px solid var(--wiley-header-border);
    }

    .theme-toggle-btn:hover {
      color: var(--wiley-header-text);
      background: var(--wiley-header-nav-hover-bg);
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
