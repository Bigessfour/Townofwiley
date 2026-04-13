import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';

import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

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