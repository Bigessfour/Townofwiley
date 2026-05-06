import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ResidentServices } from './resident-services';

function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string): string | null => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
      removeItem: (key: string): void => {
        store.delete(key);
      },
      clear: (): void => {
        store.clear();
      },
      key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
      get length(): number {
        return store.size;
      },
    },
  });
}

type ResidentServicesTestHarness = ResidentServices & {
  portalAccessForm: ResidentServices['portalAccessForm'];
  copy: ResidentServices['copy'];
  validationMessage: ResidentServices['validationMessage'];
};

function portalFieldMessage(
  component: ResidentServicesTestHarness,
  controlName: Parameters<ResidentServices['portalFieldMessage']>[0],
): ReturnType<ResidentServices['portalFieldMessage']> {
  return (
    component as unknown as {
      portalFieldMessage: ResidentServices['portalFieldMessage'];
    }
  ).portalFieldMessage(controlName);
}

describe('ResidentServices', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    window.localStorage.removeItem('tow-site-language');
  });

  it('shows field-level validation messages for invalid portal intake inputs', () => {
    TestBed.configureTestingModule({
      imports: [ResidentServices],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
        provideAnimations(),
        provideZonelessChangeDetection(),
      ],
    });

    const fixture = TestBed.createComponent(ResidentServices);
    TestBed.flushEffects();
    const component = fixture.componentInstance as ResidentServicesTestHarness;

    component.portalAccessForm.controls.fullName.markAsTouched();
    component.portalAccessForm.controls.email.markAsTouched();
    component.portalAccessForm.controls.phone.markAsTouched();
    component.portalAccessForm.controls.serviceAddress.markAsTouched();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('p-message').length).toBeGreaterThanOrEqual(4);
    expect(compiled.textContent).toContain('This field is required');
  });

  it('renders the resident service picker as native <button> elements with aria-pressed state', () => {
    TestBed.configureTestingModule({
      imports: [ResidentServices],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
        provideAnimations(),
        provideZonelessChangeDetection(),
      ],
    });

    const fixture = TestBed.createComponent(ResidentServices);
    TestBed.flushEffects();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const pickerButtons = root.querySelectorAll<HTMLButtonElement>('button.resident-picker-wrap');
    expect(pickerButtons.length).toBeGreaterThanOrEqual(2);

    pickerButtons.forEach((button) => {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
      expect(button.hasAttribute('aria-pressed')).toBe(true);
    });

    const pressedCount = Array.from(pickerButtons).filter(
      (button) => button.getAttribute('aria-pressed') === 'true',
    ).length;
    expect(pressedCount).toBe(1);
  });

  it('toggles aria-pressed when a different picker button is clicked', () => {
    TestBed.configureTestingModule({
      imports: [ResidentServices],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
        provideAnimations(),
        provideZonelessChangeDetection(),
      ],
    });

    const fixture = TestBed.createComponent(ResidentServices);
    TestBed.flushEffects();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const pickerButtons = Array.from(
      root.querySelectorAll<HTMLButtonElement>('button.resident-picker-wrap'),
    );
    const initiallyPressedIndex = pickerButtons.findIndex(
      (button) => button.getAttribute('aria-pressed') === 'true',
    );
    const targetIndex = pickerButtons.findIndex(
      (_, index) => index !== initiallyPressedIndex,
    );
    pickerButtons[targetIndex].click();
    fixture.detectChanges();

    const refreshed = Array.from(
      root.querySelectorAll<HTMLButtonElement>('button.resident-picker-wrap'),
    );
    expect(refreshed[targetIndex].getAttribute('aria-pressed')).toBe('true');
    expect(refreshed[initiallyPressedIndex].getAttribute('aria-pressed')).toBe('false');
  });

  it('returns an invalid email message for bad email input on portal form', () => {
    TestBed.configureTestingModule({
      imports: [ResidentServices],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
        provideAnimations(),
        provideZonelessChangeDetection(),
      ],
    });

    const fixture = TestBed.createComponent(ResidentServices);
    TestBed.flushEffects();
    const component = fixture.componentInstance as ResidentServicesTestHarness;

    component.portalAccessForm.controls.email.setValue('not-an-email');
    component.portalAccessForm.controls.email.markAsTouched();

    expect(portalFieldMessage(component, 'email')).toBe('Invalid email');
  });
});
