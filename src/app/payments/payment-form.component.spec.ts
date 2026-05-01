import { DOCUMENT } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LoggingService } from '../logging.service';
import { SiteLanguageService } from '../site-language';
import { PaystarConnectionService } from './paystar-connection';
import { PaymentFormComponent } from './payment-form.component';

describe('PaymentFormComponent', () => {
  function setup() {
    const paystar = {
      createLaunchRequest: vi.fn(),
      getReceipt: vi.fn(),
      syncQueuedPayments: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [PaymentFormComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: DOCUMENT, useValue: document },
        SiteLanguageService,
        { provide: PaystarConnectionService, useValue: paystar },
        { provide: LoggingService, useValue: { log: vi.fn() } },
      ],
    });

    const fixture = TestBed.createComponent(PaymentFormComponent);
    TestBed.flushEffects();
    return { fixture, component: fixture.componentInstance, paystar };
  }

  it('sets error state when submit runs on an invalid form', async () => {
    const { component } = setup();
    await component.onSubmit();
    expect(component.errorMessage()).toContain('Please fill all required fields');
    expect(component.formState()).toBe('error');
  });

  it('completes API flow: launch + receipt when mode is api', async () => {
    const { component, paystar } = setup();
    paystar.createLaunchRequest.mockResolvedValue({
      provider: 'paystar',
      mode: 'api',
      launchUrl: '',
      referenceId: 'REF-UNIT-1',
    });
    paystar.getReceipt.mockResolvedValue({
      referenceId: 'REF-UNIT-1',
      residentName: 'Unit Resident',
      amount: 42.5,
      date: '2026-05-01',
      status: 'success',
      preferredContact: 'u@example.com',
      locale: 'en',
    });

    component.form.patchValue({
      residentName: 'Unit Resident',
      serviceAddress: '1 Test St',
      accountNumber: 'ABCD1234',
      amount: 42.5,
      preferredContact: 'u@example.com',
    });

    await component.onSubmit();

    expect(paystar.createLaunchRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        residentName: 'Unit Resident',
        accountNumber: 'ABCD1234',
        amount: 42.5,
        source: 'payments-page',
      }),
    );
    expect(paystar.getReceipt).toHaveBeenCalledWith('REF-UNIT-1', 'en');
    expect(component.successMessage()).toContain('success');
    expect(component.receiptData()?.referenceId).toBe('REF-UNIT-1');
    expect(component.formState()).toBe('success');
  });

  it('clears receipt panel via closeReceipt', async () => {
    const { component, paystar } = setup();
    paystar.createLaunchRequest.mockResolvedValue({
      provider: 'paystar',
      mode: 'api',
      launchUrl: '',
      referenceId: 'REF-X',
    });
    paystar.getReceipt.mockResolvedValue({
      referenceId: 'REF-X',
      residentName: 'A',
      amount: 1,
      date: 'd',
      status: 'success',
      preferredContact: 'a@b.c',
      locale: 'en',
    });
    component.form.patchValue({
      residentName: 'A B',
      serviceAddress: 'Addr',
      accountNumber: 'ZZZZZZZZ',
      amount: 1,
      preferredContact: 'a@b.c',
    });
    await component.onSubmit();
    component.closeReceipt();
    expect(component.receiptData()).toBeNull();
    expect(component.formState()).toBe('idle');
  });

  it('retry resets error surface', async () => {
    const { component, paystar } = setup();
    paystar.createLaunchRequest.mockRejectedValue(new Error('Network down'));
    component.form.patchValue({
      residentName: 'Retry User',
      serviceAddress: 'Addr',
      accountNumber: 'YYYYYYYY',
      amount: 5,
      preferredContact: 'r@example.com',
    });
    await component.onSubmit();
    expect(component.formState()).toBe('error');

    await component.retry();
    expect(component.errorMessage()).toBe('');
    expect(component.formState()).toBe('idle');
  });
});
