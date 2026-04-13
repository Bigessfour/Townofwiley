import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SiteLanguageService } from './site-language';

const STORAGE_KEY = 'tow-site-language';

function createLanguageService() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: DOCUMENT, useValue: document }, SiteLanguageService],
  });

  return { service: TestBed.inject(SiteLanguageService) };
}

async function flushEffects(): Promise<void> {
  TestBed.flushEffects();
}

describe('SiteLanguageService', () => {
  it('defaults to English when no stored preference exists', async () => {
    const { service } = createLanguageService();

    await flushEffects();

    expect(service.currentLanguage()).toBe('en');
    expect(service.isSpanish()).toBe(false);
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  it('toggles and persists the current language', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'es');

    const { service } = createLanguageService();

    await flushEffects();

    expect(service.currentLanguage()).toBe('es');
    expect(service.isSpanish()).toBe(true);
    expect(document.documentElement.getAttribute('lang')).toBe('es');

    service.toggleLanguage();
    await flushEffects();

    expect(service.currentLanguage()).toBe('en');
    expect(service.isSpanish()).toBe(false);
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('en');

    service.setLanguage('fr');
    await flushEffects();

    expect(service.currentLanguage()).toBe('es');
    expect(service.isSpanish()).toBe(true);
    expect(document.documentElement.getAttribute('lang')).toBe('es');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('es');
  });
});