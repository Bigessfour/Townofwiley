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
});
