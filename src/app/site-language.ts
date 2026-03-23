import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type SiteLanguage = 'en' | 'es';

const DEFAULT_SITE_LANGUAGE: SiteLanguage = 'en';
const SITE_LANGUAGE_STORAGE_KEY = 'tow-site-language';

@Injectable({
  providedIn: 'root',
})
export class SiteLanguageService {
  private readonly document = inject(DOCUMENT, { optional: true });
  private readonly languageState = signal<SiteLanguage>(this.getInitialLanguage());

  readonly currentLanguage = computed(() => this.languageState());
  readonly isSpanish = computed(() => this.languageState() === 'es');

  constructor() {
    effect(() => {
      const language = this.languageState();

      this.document?.documentElement.setAttribute('lang', language);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
      }
    });
  }

  setLanguage(value: string): void {
    this.languageState.set(value === 'en' ? 'en' : 'es');
  }

  toggleLanguage(): void {
    this.languageState.update((language) => (language === 'es' ? 'en' : 'es'));
  }

  private getInitialLanguage(): SiteLanguage {
    if (typeof window === 'undefined') {
      return DEFAULT_SITE_LANGUAGE;
    }

    const storedLanguage = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);

    if (storedLanguage === 'en' || storedLanguage === 'es') {
      return storedLanguage;
    }

    return DEFAULT_SITE_LANGUAGE;
  }
}
