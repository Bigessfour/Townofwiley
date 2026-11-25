import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, computed, effect, inject, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

/** Persisted only after the resident picks a theme. Absent means follow the OS. */
export const COLOR_SCHEME_STORAGE_KEY = 'tow-color-scheme';
export const DARK_THEME_CLASS = 'wiley-dark';
export const THEME_COLOR_LIGHT = '#2a2927';
export const THEME_COLOR_DARK = '#09090b';

/**
 * Stored choice wins. Otherwise follow `prefers-color-scheme`.
 * Keep this in sync with public/wiley-theme-init.js.
 */
export function resolveColorScheme(stored: string | null, prefersDark: boolean): ColorScheme {
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return prefersDark ? 'dark' : 'light';
}

@Injectable({
  providedIn: 'root',
})
export class SiteThemeService {
  private readonly document = inject(DOCUMENT, { optional: true });
  /**
   * Starts light so the first client render matches the server HTML.
   * `public/wiley-theme-init.js` already set `.wiley-dark` before paint.
   */
  private readonly schemeState = signal<ColorScheme>('light');
  /** False until toggle(), so an OS change still applies on the next visit. */
  private readonly persistChoice = signal(false);
  /** False until after hydration, so the light placeholder does not strip `.wiley-dark`. */
  private readonly domSyncEnabled = signal(false);

  readonly isDark = computed(() => this.schemeState() === 'dark');

  constructor() {
    afterNextRender(() => {
      this.persistChoice.set(this.hasStoredChoice());
      this.schemeState.set(this.readBrowserScheme());
      this.domSyncEnabled.set(true);
    });

    effect(() => {
      if (!this.domSyncEnabled() || typeof window === 'undefined') {
        return;
      }

      const dark = this.isDark();
      const root = this.document?.documentElement;
      root?.classList.toggle(DARK_THEME_CLASS, dark);

      this.document
        ?.querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);

      if (this.persistChoice()) {
        window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, dark ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    this.persistChoice.set(true);
    this.schemeState.update((scheme) => (scheme === 'dark' ? 'light' : 'dark'));
  }

  private readBrowserScheme(): ColorScheme {
    const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    return resolveColorScheme(stored, prefersDark);
  }

  private hasStoredChoice(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark';
  }
}
