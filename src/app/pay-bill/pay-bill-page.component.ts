import { ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormControl,
  type FormGroup,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { getPaystarRuntimeConfig } from '../payments/paystar-config';
import { SiteLanguageService } from '../site-language';
import { BillPayService } from './bill-pay.service';
import {
  PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL,
  type PreferredBillPayContact,
} from './pay-bill-request';

/** Allows digits, spaces, and common phone punctuation; min length enforced separately. */
const PHONE_INPUT_PATTERN = /^[\d\s\-+().]{10,40}$/;

type PayBillForm = FormGroup<{
  fullName: FormControl<string>;
  serviceAddress: FormControl<string>;
  accountNumber: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  preferredContactMethod: FormControl<PreferredBillPayContact | null>;
  notes: FormControl<string>;
  consentToContact: FormControl<boolean>;
}>;

@Component({
  selector: 'app-pay-bill-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    SelectModule,
    MessageModule,
    ToastModule,
    TagModule,
  ],
  templateUrl: './pay-bill-page.component.html',
  styleUrl: './pay-bill-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayBillPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly billPayService = inject(BillPayService);
  private readonly messages = inject(MessageService);
  private readonly siteLanguage = inject(SiteLanguageService);
  private readonly viewportScroller = inject(ViewportScroller);

  protected readonly submitting = signal(false);
  protected readonly lang = signal<'en' | 'es'>(this.siteLanguage.currentLanguage());

  readonly form: PayBillForm = this.fb.group({
    fullName: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    serviceAddress: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    accountNumber: this.fb.nonNullable.control('', {
      validators: [Validators.pattern(/^[A-Za-z0-9-]*$/)],
    }),
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    phone: this.fb.nonNullable.control('', {
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(PHONE_INPUT_PATTERN),
      ],
    }),
    preferredContactMethod: this.fb.control<PreferredBillPayContact | null>(null, {
      validators: [Validators.required],
    }),
    notes: this.fb.nonNullable.control(''),
    consentToContact: this.fb.nonNullable.control(false, {
      validators: [Validators.requiredTrue],
    }),
  });

  protected readonly preferredContactOptions = computed(() =>
    this.lang() === 'en'
      ? [
          { label: 'Email', value: 'email' as const },
          { label: 'Phone call', value: 'phone' as const },
          { label: 'Text message (SMS)', value: 'sms' as const },
          { label: 'U.S. Mail', value: 'mail' as const },
        ]
      : [
          { label: 'Correo electrónico', value: 'email' as const },
          { label: 'Llamada telefónica', value: 'phone' as const },
          { label: 'Mensaje de texto (SMS)', value: 'sms' as const },
          { label: 'Correo postal', value: 'mail' as const },
        ],
  );

  protected readonly copy = computed(() => {
    const es = this.lang() === 'es';
    return {
      cardsRegionLabel: es ? 'Pago rápido y pago integrado' : 'Quick pay and embedded pay',
      heroTitle: es ? 'Pague su factura de servicios en línea' : 'Pay Your Utility Bill Online',
      heroSubtitle: es
        ? 'Pague en línea por el portal seguro, envíe una solicitud de facturación o llame al Ayuntamiento.'
        : 'Pay online through the secure portal, submit a billing request, or call Town Hall for assistance.',
      quickPayTitle: es ? 'Pago rápido (portal alojado)' : 'Quick Pay (hosted portal)',
      quickPayBody: es
        ? 'Use el portal alojado de Paystar para pagar con tarjeta o cuenta bancaria cuando esté activo en este sitio.'
        : 'Use the hosted Paystar portal to pay by card or bank transfer when it is active on this site.',
      quickPayCta: es ? 'Abrir portal de pago' : 'Open payment portal',
      quickPayPlaceholderNote: es
        ? 'El enlace de pago en línea se está finalizando; use el formulario siguiente o llame al Ayuntamiento.'
        : 'The online payment link is being finalized—use the form below or call Town Hall.',
      comingSoonTitle: es ? 'Pago integrado en el sitio' : 'Embedded pay (in-site)',
      comingSoonBadge: es ? 'En desarrollo' : 'In development',
      comingSoonBody: es
        ? 'El pago integrado en esta página estará disponible cuando finalice la configuración con Paystar.'
        : 'In-site checkout will be available once Paystar integration is complete.',
      requestEarlyAccess: es ? 'Solicitar ayuda con facturación' : 'Request billing assistance',
      formSectionTitle: es ? 'Solicitud de ayuda con facturación' : 'Billing assistance request',
      formSectionIntro: es
        ? 'Envíe sus datos y la secretaria municipal dará seguimiento a saldos, opciones de pago y su cuenta.'
        : 'Submit your details and the town clerk will follow up on balances, payment options, and your account.',
      fullNameLabel: es ? 'Nombre completo' : 'Full name',
      serviceAddressLabel: es ? 'Dirección del servicio' : 'Service address',
      accountNumberLabel: es
        ? 'Número de cuenta de servicios (opcional)'
        : 'Utility account number (optional)',
      emailLabel: es ? 'Correo electrónico' : 'Email',
      phoneLabel: es ? 'Teléfono' : 'Phone',
      preferredContactLabel: es ? 'Método de contacto preferido' : 'Preferred contact method',
      notesLabel: es
        ? 'Preguntas o detalles adicionales (opcional)'
        : 'Additional questions or details (optional)',
      consentLabel: es
        ? 'Acepto que el Ayuntamiento de Wiley me contacte sobre facturación y opciones de pago.'
        : 'I agree that the Town of Wiley may contact me about billing and payment options.',
      submitLabel: es ? 'Enviar solicitud' : 'Submit request',
      submittingLabel: es ? 'Enviando…' : 'Sending…',
      helpTitle: es ? '¿Necesita ayuda ahora?' : 'Need help right now?',
      helpBody: es
        ? 'La secretaria municipal puede orientarle sobre saldos, opciones de pago y su cuenta.'
        : 'The town clerk can help with balances, payment options, and your account.',
      helpPhoneLabel: es ? 'Teléfono del Ayuntamiento' : 'Town Hall phone',
      helpEmailLabel: es ? 'Correo de la secretaria' : 'Clerk email',
      successToastSummary: es ? 'Solicitud enviada' : 'Request received',
      successToastDetail: es
        ? 'Gracias. Debbie Dillon se pondrá en contacto con usted en 1 a 2 días hábiles.'
        : 'Thank you. Debbie Dillon will follow up within 1–2 business days.',
      errorToastSummary: es ? 'No se pudo enviar' : 'Could not send',
      errorToastDetail: es
        ? 'Inténtelo de nuevo o use el correo o teléfono de abajo.'
        : 'Please try again or use the phone or email below.',
      mailtoToastSummary: es ? 'Abriendo su correo' : 'Opening your mail app',
      mailtoToastDetail: es
        ? 'Complete el mensaje para enviar la solicitud a la secretaria.'
        : 'Complete the message to send your request to the clerk.',
      validationSummary: es
        ? 'Revise los campos marcados.'
        : 'Please review the highlighted fields.',
    };
  });

  protected readonly quickPayHref = computed(() => {
    const url = getPaystarRuntimeConfig().portalUrl.trim();
    return url || PAY_BILL_QUICK_PAY_PORTAL_PLACEHOLDER_URL;
  });

  protected readonly quickPayIsPlaceholder = computed(
    () => !getPaystarRuntimeConfig().portalUrl.trim(),
  );

  constructor() {
    effect(() => {
      this.lang.set(this.siteLanguage.currentLanguage());
    });
  }

  protected scrollToRequestForm(): void {
    this.viewportScroller.scrollToAnchor('bill-pay-request');
    const el = document.getElementById('bill-pay-request');
    el?.focus();
  }

  protected fieldMessage(controlName: keyof PayBillForm['controls']): string | null {
    const control = this.form.controls[controlName];
    if (!control.invalid || !control.touched) {
      return null;
    }
    if (controlName === 'phone') {
      if (control.hasError('required')) {
        return this.lang() === 'es' ? 'Campo obligatorio' : 'This field is required';
      }
      if (control.hasError('minlength')) {
        return this.lang() === 'es'
          ? 'El teléfono es demasiado corto (mínimo 10 caracteres).'
          : 'Phone number is too short (at least 10 characters).';
      }
      if (control.hasError('pattern')) {
        return this.lang() === 'es'
          ? 'Use solo números y símbolos de teléfono habituales.'
          : 'Use digits and common phone characters only.';
      }
    }
    if (control.hasError('required')) {
      return this.lang() === 'es' ? 'Campo obligatorio' : 'This field is required';
    }
    if (control.hasError('requiredTrue')) {
      return this.lang() === 'es'
        ? 'Debe aceptar para continuar'
        : 'Consent is required to continue';
    }
    if (control.hasError('email')) {
      return this.lang() === 'es' ? 'Correo no válido' : 'Invalid email';
    }
    if (control.hasError('pattern')) {
      return this.lang() === 'es'
        ? 'Solo letras, números o guiones.'
        : 'Use only letters, numbers, or hyphens.';
    }
    return this.copy().validationSummary;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.messages.add({
        key: 'bill-pay',
        severity: 'warn',
        summary: this.copy().errorToastSummary,
        detail: this.copy().validationSummary,
        life: 6000,
      });
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const locale = this.siteLanguage.currentLanguage();

    try {
      const result = await this.billPayService.submitRequest({
        fullName: raw.fullName,
        serviceAddress: raw.serviceAddress,
        accountNumber: raw.accountNumber,
        email: raw.email,
        phone: raw.phone,
        preferredContactMethod: raw.preferredContactMethod!,
        notes: raw.notes,
        consentToContact: raw.consentToContact,
        locale,
        source: 'pay-bill-page',
      });

      if (result.outcome === 'api-success') {
        this.messages.add({
          key: 'bill-pay',
          severity: 'success',
          summary: this.copy().successToastSummary,
          detail: this.copy().successToastDetail,
          life: 8000,
        });
        this.form.reset();
        this.form.patchValue({ consentToContact: false });
        return;
      }

      this.messages.add({
        key: 'bill-pay',
        severity: 'info',
        summary: this.copy().mailtoToastSummary,
        detail: this.copy().mailtoToastDetail,
        life: 5000,
      });
      if (typeof window !== 'undefined') {
        window.setTimeout(() => window.location.assign(result.href), 400);
      }
    } catch {
      this.messages.add({
        key: 'bill-pay',
        severity: 'error',
        summary: this.copy().errorToastSummary,
        detail: this.copy().errorToastDetail,
        life: 8000,
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
