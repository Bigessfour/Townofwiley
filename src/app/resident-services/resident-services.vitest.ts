import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { ResidentServices } from './resident-services';

type ResidentServicesHarness = Record<string, unknown> & Partial<ResidentServices>;

function createHarness(): ResidentServicesHarness {
  const component = Object.create(ResidentServices.prototype) as ResidentServicesHarness;
  component.paymentForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    streetAddress: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    poBox: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    accountQuestion: new FormControl('', { nonNullable: true }),
  });
  component.copy = () => ({
    paymentEmailLabel: 'Email address',
    requiredFieldMessage: 'This field is required.',
    invalidEmailMessage: 'Enter a valid email address.',
    paymentSubject: 'Utility payment help request',
    paymentNameLabel: 'Resident name',
    paymentPhoneLabel: 'Phone number',
    paymentStreetAddressLabel: 'Street address',
    paymentPoBoxLabel: 'PO Box',
    paymentQuestionLabel: 'Billing question',
  } as unknown as Record<string, string>);
  component.validationMessage = (ResidentServices.prototype as unknown as Record<string, unknown>).validationMessage;
  component.paymentFormValue = () => component.paymentForm.getRawValue();

  return component;
}

describe('ResidentServices validation helpers', () => {
  it('returns required-field messaging for touched empty payment inputs', () => {
    const component = createHarness();
    const control = component.paymentForm.controls.name;

    control.markAsTouched();

    expect(component.validationMessage(control, 'Resident name')).toBe(
      'Resident name: This field is required.',
    );
  });

  it('returns invalid-email messaging for malformed payment email input', () => {
    const component = createHarness();
    const control = component.paymentForm.controls.email;

    control.setValue('not-an-email');
    control.markAsTouched();
    control.setErrors({ email: true });

    expect(component.validationMessage(control, 'Email address')).toBe('Enter a valid email address.');
  });

  it('returns required message for other form fields like issue location', () => {
    const component = createHarness();
    // Simulate issueForm structure for validation logic
    const control = new FormControl('', { validators: [Validators.required], nonNullable: true });
    control.markAsTouched();
    control.setErrors({ required: true });

    expect(component.validationMessage(control, 'Location')).toBe('Location: This field is required.');
  });
});

describe('ResidentServices derived state & mailto', () => {
  it('builds a correct mailto href for payment help', () => {
    const component = createHarness();
    component.paymentForm.patchValue({
      name: 'Jane Smith',
      phone: '719-555-0199',
      email: 'jane@example.com',
      streetAddress: '123 Main St',
      accountQuestion: 'How much do I owe?'
    });

    // Mock clerk contact email
    (component as Record<string, unknown>).clerkContact = () => ({ href: 'mailto:clerk@wiley.gov' });
    
    const href = component['buildPaymentMailtoHref']();
    expect(href).toContain('mailto:clerk@wiley.gov');
    expect(href).toContain('subject=Utility+payment+help+request');
    expect(href).toContain('Jane+Smith');
    expect(href).toContain('How+much+do+I+owe%3F');
  });

  it('returns null for payment mailto if form is invalid', () => {
    const component = createHarness();
    component.paymentForm.controls.name.setValue(''); // Required
    
    const href = component['buildPaymentMailtoHref']();
    expect(href).toBeNull();
  });
});
