import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { Ripple } from 'primeng/ripple';
import type { PreferredBillPayContact } from '../../pay-bill/pay-bill-request';

export type PortalAccessFormGroup = FormGroup<{
  fullName: FormControl<string>;
  serviceAddress: FormControl<string>;
  accountNumber: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string>;
  preferredContactMethod: FormControl<PreferredBillPayContact | null>;
  notes: FormControl<string>;
  consentToContact: FormControl<boolean>;
}>;

export type ContactUpdateFormGroup = FormGroup<{
  fullName: FormControl<string>;
  serviceAddress: FormControl<string>;
  poBox: FormControl<string>;
  phone: FormControl<string>;
  email: FormControl<string>;
  notes: FormControl<string>;
}>;

export interface PaymentPanelCopy {
  paymentMeta: string;
  paymentTitle: string;
  paymentBody: string;
  paymentIcon: string;
  payNowCardTitle: string;
  payNowCardBody: string;
  payNowCta: string;
  payNowPlaceholderNote: string;
  payNowUnavailableNote: string;
  payNowUnavailableLabel: string;
  portalSoonTitle: string;
  portalSoonBody: string;
  portalSoonBadge: string;
  requestEarlyAccessCta: string;
  portalFormTitle: string;
  portalFormIntro: string;
  fullNameLabel: string;
  serviceAddressLabel: string;
  accountNumberLabel: string;
  emailLabel: string;
  phoneLabel: string;
  preferredContactLabel: string;
  notesLabel: string;
  consentLabel: string;
  submitPortalLabel: string;
  submittingPortalLabel: string;
  utilityBillFormLinkLabel: string;
  phoneFallbackLabel: string;
  emailFallbackLabel: string;
  contactUpdateToggleLabel: string;
  contactUpdateBody: string;
  contactUpdateFullNameLabel: string;
  contactUpdateServiceAddressLabel: string;
  contactUpdatePoBoxLabel: string;
  contactUpdatePhoneLabel: string;
  contactUpdateEmailLabel: string;
  contactUpdateNotesLabel: string;
  contactUpdateActionLabel: string;
  contactUpdateDismissLabel: string;
}

@Component({
  selector: 'app-resident-payment-panel',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    Ripple,
    RouterLink,
    SelectModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './payment-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentPaymentPanel {
  readonly copy = input.required<PaymentPanelCopy>();
  readonly portalAccessForm = input.required<PortalAccessFormGroup>();
  readonly contactUpdateForm = input.required<ContactUpdateFormGroup>();
  readonly portalSubmitting = input.required<boolean>();
  readonly contactUpdateExpanded = input.required<boolean>();
  readonly contactUpdateStatus = input<string | null>(null);
  readonly hasSubmittedContactUpdate = input.required<boolean>();
  readonly contactUpdateMailtoHref = input<string | null>(null);
  readonly quickPayHref = input.required<string>();
  readonly quickPayIsPlaceholder = input.required<boolean>();
  readonly quickPayDisabled = input.required<boolean>();
  readonly preferredContactOptions =
    input.required<{ value: PreferredBillPayContact; label: string }[]>();
  readonly townHallPhoneHref = input<string | null>(null);
  readonly townHallPhoneLabel = input<string>('');
  readonly clerkEmailHref = input<string | null>(null);
  readonly clerkEmailLabel = input<string>('');
  readonly lang = input.required<'en' | 'es'>();
  readonly portalFieldMessage =
    input.required<(controlName: keyof PortalAccessFormGroup['controls']) => string | null>();
  readonly validationMessage =
    input.required<(control: AbstractControl, fieldLabel: string) => string | null>();

  readonly submitPortal = output<void>();
  readonly toggleContactUpdate = output<void>();
  readonly openContactUpdateMailto = output<Event>();
  readonly dismissContactUpdate = output<void>();
  readonly scrollToBillingIntake = output<void>();

  protected onPortalSubmit(): void {
    this.submitPortal.emit();
  }
  protected onToggleContactUpdate(): void {
    this.toggleContactUpdate.emit();
  }
  protected onOpenContactUpdateMailto(event: Event): void {
    this.openContactUpdateMailto.emit(event);
  }
  protected onDismissContactUpdate(): void {
    this.dismissContactUpdate.emit();
  }
  protected onScrollToBillingIntake(): void {
    this.scrollToBillingIntake.emit();
  }
}
