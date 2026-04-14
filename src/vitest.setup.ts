import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

const globalScope = globalThis as typeof globalThis & {
  global?: typeof globalThis;
};

globalScope.global ??= globalThis;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: true },
});

afterEach(() => {
  delete (window as Window & {
    __TOW_RUNTIME_CONFIG__?: unknown;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
  }).__TOW_RUNTIME_CONFIG__;
  delete (window as Window & {
    __TOW_RUNTIME_CONFIG__?: unknown;
    __TOW_RUNTIME_CONFIG_OVERRIDE__?: unknown;
  }).__TOW_RUNTIME_CONFIG_OVERRIDE__;
  window.localStorage.clear();
  document.documentElement.removeAttribute('lang');
  TestBed.resetTestingModule();
  vi.restoreAllMocks();
});