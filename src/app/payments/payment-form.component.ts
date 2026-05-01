import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaystarConnectionService, PaystarLaunchRequest, ReceiptData } from './paystar-connection';
import { LoggingService } from '../logging.service';
import { sanitizePlainText } from '../input-sanitization';
import { SiteLanguage, SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './payment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentFormComponent {
  private static readonly PAYMENT_DRAFT_KEY = 'tow-payment-form-draft';

  private readonly fb = inject(FormBuilder);
  private readonly paystarService = inject(PaystarConnectionService);
  private readonly logging = inject(LoggingService);
  private readonly siteLanguage = inject(SiteLanguageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form: FormGroup;
  readonly currentLanguage = signal<SiteLanguage>(this.siteLanguage.currentLanguage());
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly receiptData = signal<ReceiptData | null>(null);
  readonly referenceId = signal<string | null>(null);

  readonly hasErrors = computed(() => !!this.errorMessage());
  readonly isSuccess = computed(() => !!this.successMessage() || !!this.receiptData());

  readonly formState = signal<'idle' | 'submitting' | 'success' | 'error'>('idle');

  constructor() {
    this.form = this.fb.group({
      residentName: ['', [Validators.required, Validators.minLength(2)]],
      serviceAddress: ['', [Validators.required]],
      accountNumber: ['', [Validators.required, Validators.pattern(/^[A-Z0-9]{8,12}$/i)]],
      amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
      preferredContact: ['', [Validators.required, Validators.email]],
      dueDate: [''],
    });

    effect(() => {
      this.currentLanguage.set(this.siteLanguage.currentLanguage());
    });

    this.restorePaymentDraft();
    this.form.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => this.persistPaymentDraft(value));

    void this.checkOfflineQueue();
  }

  closeReceipt(): void {
    this.receiptData.set(null);
    this.successMessage.set('');
    this.formState.set('idle');
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.errorMessage.set('Please fill all required fields correctly.');
      this.formState.set('error');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.formState.set('submitting');

    const raw = this.form.getRawValue();
    const accountSanitized = sanitizePlainText(String(raw.accountNumber ?? ''), 24).replace(
      /[^a-zA-Z0-9]/g,
      '',
    );
    const request: PaystarLaunchRequest = {
      residentName: sanitizePlainText(String(raw.residentName ?? ''), 120),
      serviceAddress: sanitizePlainText(String(raw.serviceAddress ?? ''), 240),
      accountNumber: accountSanitized || undefined,
      amount: raw.amount ?? undefined,
      preferredContact: sanitizePlainText(String(raw.preferredContact ?? ''), 254),
      dueDate: sanitizePlainText(String(raw.dueDate ?? ''), 32) || undefined,
      locale: this.currentLanguage(),
      source: 'payments-page',
    };

    try {
      if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
        await this.paystarService.queuePaymentOffline(request);
        this.clearPaymentDraft();
        this.successMessage.set('Payment queued offline. It will sync when online.');
        this.formState.set('success');
        return;
      }

      const response = await this.paystarService.createLaunchRequest(request);
      this.referenceId.set(response.referenceId ?? null);

      if (response.mode === 'hosted') {
        this.clearPaymentDraft();
        window.location.href = response.launchUrl;
        return;
      }

      this.clearPaymentDraft();
      this.successMessage.set('Payment processed successfully!');
      if (response.referenceId) {
        const receipt = await this.paystarService.getReceipt(
          response.referenceId,
          this.currentLanguage(),
        );
        this.receiptData.set(receipt);
      }
      this.formState.set('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      this.logging.log('error', 'Payment submission failed', { error: String(err) });
      this.errorMessage.set(message);
      this.formState.set('error');
    } finally {
      this.loading.set(false);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await this.paystarService.syncQueuedPayments();
      }
    }
  }

  async retry(): Promise<void> {
    this.formState.set('idle');
    this.errorMessage.set('');
    await this.paystarService.syncQueuedPayments();
  }

  async downloadReceipt(): Promise<void> {
    const data = this.receiptData();
    if (!data) return;

    const receiptBlob = await this.generateReceiptPDF(data);
    const url = URL.createObjectURL(receiptBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${data.referenceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async generateReceiptPDF(data: ReceiptData): Promise<Blob> {
    const content = `Receipt for ${data.residentName}
Amount: $${data.amount}
Date: ${data.date}
Status: ${data.status}
Contact: ${data.preferredContact}
Reference: ${data.referenceId}
`;
    return new Blob([content], { type: 'application/pdf' });
  }

  private static isBrowserLocalStorageAvailable(): boolean {
    try {
      return (
        typeof localStorage !== 'undefined' &&
        typeof localStorage.getItem === 'function' &&
        typeof localStorage.setItem === 'function' &&
        typeof localStorage.removeItem === 'function'
      );
    } catch {
      return false;
    }
  }

  private async checkOfflineQueue(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      await this.paystarService.syncQueuedPayments();
    }
  }

  private restorePaymentDraft(): void {
    if (!PaymentFormComponent.isBrowserLocalStorageAvailable()) {
      return;
    }
    const raw = localStorage.getItem(PaymentFormComponent.PAYMENT_DRAFT_KEY);
    if (!raw) {
      return;
    }
    try {
      const draft = JSON.parse(raw) as Record<string, unknown>;
      this.form.patchValue(draft, { emitEvent: false });
    } catch {
      localStorage.removeItem(PaymentFormComponent.PAYMENT_DRAFT_KEY);
    }
  }

  private persistPaymentDraft(value: object): void {
    if (!PaymentFormComponent.isBrowserLocalStorageAvailable()) {
      return;
    }
    try {
      localStorage.setItem(PaymentFormComponent.PAYMENT_DRAFT_KEY, JSON.stringify(value));
    } catch {
      // ignore quota / private mode
    }
  }

  private clearPaymentDraft(): void {
    if (!PaymentFormComponent.isBrowserLocalStorageAvailable()) {
      return;
    }
    localStorage.removeItem(PaymentFormComponent.PAYMENT_DRAFT_KEY);
  }
}
