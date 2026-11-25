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

describe('ResidentServices', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    window.localStorage.removeItem('tow-site-language');
  });

  it('links pay bill and weather cards to their pages and hides the extra bill panel', () => {
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
    const payBillLink = root.querySelector(
      '[data-testid="resident-service-payment"]',
    ) as HTMLAnchorElement | null;
    const weatherLink = root.querySelector(
      '[data-testid="resident-service-weather"]',
    ) as HTMLAnchorElement | null;
    const issueLink = root.querySelector(
      '[data-testid="resident-service-issue"]',
    ) as HTMLAnchorElement | null;

    expect(payBillLink?.getAttribute('href')).toContain('/pay-bill');
    expect(weatherLink?.getAttribute('href')).toContain('/weather');
    expect(issueLink?.getAttribute('href')).toContain('issue-report');
    expect(root.querySelector('#payment-help')).toBeNull();
    expect(root.querySelector('#issue-report')).toBeNull();
  });

  it('renders the resident service picker as links', () => {
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
    const pickerLinks = root.querySelectorAll<HTMLAnchorElement>('a.resident-picker-wrap');
    expect(pickerLinks.length).toBe(3);

    pickerLinks.forEach((link) => {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBeTruthy();
    });
  });

  it('shows the issue report when the issue card destination is active', () => {
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
    const issueLink = root.querySelector(
      '[data-testid="resident-service-issue"]',
    ) as HTMLAnchorElement | null;
    expect(issueLink?.getAttribute('href')).toContain('issue-report');

    (
      fixture.componentInstance as unknown as {
        activeServicePanel: { set: (value: 'issue') => void };
      }
    ).activeServicePanel.set('issue');
    fixture.detectChanges();

    expect(root.querySelector('#issue-report')).not.toBeNull();
    expect(issueLink?.getAttribute('aria-current')).toBe('page');
  });
});
