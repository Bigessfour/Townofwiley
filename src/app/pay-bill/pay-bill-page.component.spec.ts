import { ViewportScroller } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { SiteLanguageService } from '../site-language';
import { BillPayService } from './bill-pay.service';
import { PayBillPageComponent } from './pay-bill-page.component';

describe('PayBillPageComponent', () => {
  interface RuntimeShape {
    payments?: { provider?: string; paystar?: { mode?: string; portalUrl?: string } };
  }

  function setRuntimePaystarMode(mode: 'none' | 'hosted' | 'api', portalUrl = ''): void {
    const w = window as Window & {
      __TOW_RUNTIME_CONFIG__?: RuntimeShape;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeShape;
    };
    w.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      payments: { provider: 'paystar', paystar: { mode, portalUrl } },
    };
  }

  function clearRuntimePaystarOverride(): void {
    const w = window as Window & {
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: RuntimeShape;
    };
    delete w.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  }

  afterEach(() => {
    clearRuntimePaystarOverride();
  });

  function setup() {
    const billPay = {
      submitRequest: vi.fn().mockResolvedValue({ outcome: 'api-success' as const }),
    };

    TestBed.configureTestingModule({
      imports: [PayBillPageComponent],
      providers: [
        provideAnimations(),
        provideZonelessChangeDetection(),
        SiteLanguageService,
        MessageService,
        { provide: ViewportScroller, useValue: { scrollToAnchor: vi.fn(), setOffset: vi.fn() } },
        { provide: BillPayService, useValue: billPay },
      ],
    });

    const fixture = TestBed.createComponent(PayBillPageComponent);
    TestBed.flushEffects();
    return { fixture, component: fixture.componentInstance, billPay };
  }

  it('does not call submit when the form is invalid', async () => {
    const { component, billPay } = setup();
    await component.onSubmit();
    expect(billPay.submitRequest).not.toHaveBeenCalled();
  });

  it('submits sanitized payload when the form is valid', async () => {
    const { component, billPay } = setup();
    component.form.patchValue({
      fullName: 'Pat Citizen',
      serviceAddress: '10 Oak St',
      accountNumber: '',
      email: 'pat@example.com',
      phone: '303-555-0100',
      preferredContactMethod: 'phone',
      notes: 'Need portal access',
      consentToContact: true,
    });

    await component.onSubmit();

    expect(billPay.submitRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Pat Citizen',
        serviceAddress: '10 Oak St',
        preferredContactMethod: 'phone',
        consentToContact: true,
        locale: 'en',
      }),
    );
  });

  it('disables the portal CTA and shows a bilingual fallback when Paystar mode is "none"', () => {
    setRuntimePaystarMode('none');
    const { fixture, component } = setup();
    fixture.detectChanges();

    expect(component['quickPayDisabled']()).toBe(true);

    const root = fixture.nativeElement as HTMLElement;
    const disabledCta = root.querySelector<HTMLButtonElement>(
      '[data-testid="pay-bill-portal-cta-disabled"]',
    );
    const fallbackMessage = root.querySelector('[data-testid="pay-bill-portal-unavailable"]');

    expect(disabledCta).not.toBeNull();
    expect(disabledCta?.disabled).toBe(true);
    expect(fallbackMessage).not.toBeNull();
    expect(fallbackMessage?.textContent ?? '').toMatch(/portal|portal/i);
    expect(root.querySelector('[data-testid="pay-bill-portal-cta"]')).toBeNull();
  });

  it('keeps the portal CTA active when Paystar mode is "hosted"', () => {
    setRuntimePaystarMode('hosted', 'https://secure.paystar.io/pay/townofwiley-utility');
    const { fixture, component } = setup();
    fixture.detectChanges();

    expect(component['quickPayDisabled']()).toBe(false);

    const root = fixture.nativeElement as HTMLElement;
    const activeCta = root.querySelector<HTMLAnchorElement>(
      '[data-testid="pay-bill-portal-cta"]',
    );
    expect(activeCta).not.toBeNull();
    expect(activeCta?.getAttribute('href')).toContain('paystar.io');
    expect(root.querySelector('[data-testid="pay-bill-portal-cta-disabled"]')).toBeNull();
  });
});
