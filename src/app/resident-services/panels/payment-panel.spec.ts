import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import type { PreferredBillPayContact } from '../../pay-bill/pay-bill-request';
import {
  type ContactUpdateFormGroup,
  type PortalAccessFormGroup,
  ResidentPaymentPanel,
} from './payment-panel';

function makePortalForm(): PortalAccessFormGroup {
  return new FormGroup({
    fullName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    serviceAddress: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    accountNumber: new FormControl('', { nonNullable: true }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContactMethod: new FormControl<PreferredBillPayContact | null>(null, {
      validators: [Validators.required],
    }),
    notes: new FormControl('', { nonNullable: true }),
    consentToContact: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });
}

function makeContactUpdateForm(): ContactUpdateFormGroup {
  return new FormGroup({
    fullName: new FormControl('', { nonNullable: true }),
    serviceAddress: new FormControl('', { nonNullable: true }),
    poBox: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    email: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });
}

const COPY = {
  paymentMeta: 'Utilities',
  paymentTitle: 'Pay bill',
  paymentBody: 'Pay online',
  paymentIcon: 'pi pi-credit-card',
  payNowCardTitle: 'Pay now with Paystar',
  payNowCardBody: 'Pay your utility bill',
  payNowCta: 'Pay now',
  payNowPlaceholderNote: 'Placeholder',
  payNowUnavailableNote: 'Unavailable',
  payNowUnavailableLabel: 'Portal unavailable',
  portalSoonTitle: 'Portal soon',
  portalSoonBody: 'Coming soon',
  portalSoonBadge: 'Coming soon',
  requestEarlyAccessCta: 'Request early access',
  portalFormTitle: 'Billing help',
  portalFormIntro: 'Send your details',
  fullNameLabel: 'Full name',
  serviceAddressLabel: 'Service address',
  accountNumberLabel: 'Account number',
  emailLabel: 'Email',
  phoneLabel: 'Phone',
  preferredContactLabel: 'Preferred contact',
  notesLabel: 'Notes',
  consentLabel: 'Consent',
  submitPortalLabel: 'Submit',
  submittingPortalLabel: 'Sending',
  utilityBillFormLinkLabel: 'Pay bill page',
  phoneFallbackLabel: 'Call',
  emailFallbackLabel: 'Email',
  contactUpdateToggleLabel: 'Update contact info',
  contactUpdateBody: 'Help the Clerk',
  contactUpdateFullNameLabel: 'Full name',
  contactUpdateServiceAddressLabel: 'Service address',
  contactUpdatePoBoxLabel: 'PO Box',
  contactUpdatePhoneLabel: 'Phone',
  contactUpdateEmailLabel: 'Email',
  contactUpdateNotesLabel: 'Notes',
  contactUpdateActionLabel: 'Send',
  contactUpdateDismissLabel: 'Skip',
};

describe('ResidentPaymentPanel', () => {
  function setUp() {
    TestBed.configureTestingModule({
      imports: [ResidentPaymentPanel],
      providers: [provideRouter([]), provideAnimations()],
    });
    const fixture = TestBed.createComponent(ResidentPaymentPanel);
    fixture.componentRef.setInput('copy', COPY);
    fixture.componentRef.setInput('portalAccessForm', makePortalForm());
    fixture.componentRef.setInput('contactUpdateForm', makeContactUpdateForm());
    fixture.componentRef.setInput('portalSubmitting', false);
    fixture.componentRef.setInput('contactUpdateExpanded', false);
    fixture.componentRef.setInput('hasSubmittedContactUpdate', false);
    fixture.componentRef.setInput('quickPayHref', 'https://example.com/pay');
    fixture.componentRef.setInput('quickPayIsPlaceholder', false);
    fixture.componentRef.setInput('quickPayDisabled', false);
    fixture.componentRef.setInput('preferredContactOptions', [
      { value: 'email', label: 'Email' },
    ]);
    fixture.componentRef.setInput('lang', 'en');
    fixture.componentRef.setInput('portalFieldMessage', () => null);
    fixture.componentRef.setInput('validationMessage', () => null);
    fixture.detectChanges();
    return fixture;
  }

  it('renders payment heading and Paystar quick-pay link', () => {
    const fixture = setUp();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent).toContain('Pay bill');
    expect(el.querySelector('a[href="https://example.com/pay"]')).toBeTruthy();
  });

  it('disables the Paystar portal link when quick pay is unavailable', () => {
    const fixture = setUp();
    fixture.componentRef.setInput('quickPayHref', '');
    fixture.componentRef.setInput('quickPayIsPlaceholder', true);
    fixture.componentRef.setInput('quickPayDisabled', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="resident-pay-portal-cta"]')).toBeNull();
    expect(el.querySelector('[data-testid="resident-pay-portal-cta-disabled"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="resident-pay-portal-placeholder"]')).toBeTruthy();
  });

  it('emits submitPortal when the portal form is submitted', () => {
    const fixture = setUp();
    let submitted = 0;
    fixture.componentInstance.submitPortal.subscribe(() => {
      submitted += 1;
    });
    fixture.nativeElement.querySelector('form.resident-portal-form')
      ?.dispatchEvent(new Event('submit'));
    expect(submitted).toBe(1);
  });
});
