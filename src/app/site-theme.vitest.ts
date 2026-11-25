import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  COLOR_SCHEME_STORAGE_KEY,
  DARK_THEME_CLASS,
  SiteThemeService,
  THEME_COLOR_DARK,
  THEME_COLOR_LIGHT,
  resolveColorScheme,
} from './site-theme';
import { ThemeToggle } from './theme-toggle';

function stubPrefersDark(prefersDark: boolean): void {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches: prefersDark && query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
}

function ensureThemeColorMeta(): void {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.append(meta);
  }
}

async function createThemeService(): Promise<{
  service: SiteThemeService;
  fixture: ComponentFixture<ThemeToggle>;
}> {
  ensureThemeColorMeta();
  TestBed.configureTestingModule({
    imports: [ThemeToggle],
    providers: [
      provideZonelessChangeDetection(),
      { provide: DOCUMENT, useValue: document },
      SiteThemeService,
    ],
  });

  const fixture = TestBed.createComponent(ThemeToggle);
  fixture.detectChanges();
  await fixture.whenStable();
  await TestBed.flushEffects();

  return { service: TestBed.inject(SiteThemeService), fixture };
}

describe('resolveColorScheme', () => {
  it('uses a stored choice before the operating system', () => {
    expect(resolveColorScheme('light', true)).toBe('light');
    expect(resolveColorScheme('dark', false)).toBe('dark');
  });

  it('follows prefers-color-scheme when nothing is stored', () => {
    expect(resolveColorScheme(null, true)).toBe('dark');
    expect(resolveColorScheme(null, false)).toBe('light');
    expect(resolveColorScheme('system', true)).toBe('dark');
  });
});

describe('SiteThemeService', () => {
  afterEach(() => {
    document.documentElement.classList.remove(DARK_THEME_CLASS);
  });

  it('follows a dark operating system without writing localStorage', async () => {
    stubPrefersDark(true);
    const { service } = await createThemeService();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      THEME_COLOR_DARK,
    );
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBeNull();
  });

  it('keeps a stored light choice when the operating system is dark', async () => {
    stubPrefersDark(true);
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, 'light');
    const { service } = await createThemeService();

    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      THEME_COLOR_LIGHT,
    );
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light');
  });

  it('persists an explicit toggle', async () => {
    stubPrefersDark(false);
    const { service } = await createThemeService();

    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBeNull();

    service.toggle();
    await TestBed.flushEffects();

    expect(service.isDark()).toBe(true);
    expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(true);
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('dark');

    service.toggle();
    await TestBed.flushEffects();

    expect(service.isDark()).toBe(false);
    expect(document.documentElement.classList.contains(DARK_THEME_CLASS)).toBe(false);
    expect(window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)).toBe('light');
  });
});
