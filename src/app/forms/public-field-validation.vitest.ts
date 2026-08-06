import { FormControl, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { publicRequiredFieldMessage } from './public-field-validation';

describe('publicRequiredFieldMessage', () => {
  const messages = {
    requiredFieldMessage: 'Required',
    invalidEmailMessage: 'Invalid email',
    invalidSmsMessage: 'Invalid phone',
  };

  it('returns null when control is untouched or valid', () => {
    const control = new FormControl('', { validators: Validators.required });
    expect(publicRequiredFieldMessage(control, 'Name', messages)).toBeNull();
    control.setValue('ok');
    control.markAsTouched();
    expect(publicRequiredFieldMessage(control, 'Name', messages)).toBeNull();
  });

  it('returns labeled required message when required and touched', () => {
    const control = new FormControl('', { validators: Validators.required });
    control.markAsTouched();
    expect(publicRequiredFieldMessage(control, 'Name', messages)).toBe('Name: Required');
  });

  it('returns email and sms messages for those errors', () => {
    const email = new FormControl('x', { validators: Validators.email });
    email.markAsTouched();
    expect(publicRequiredFieldMessage(email, 'Email', messages)).toBe('Invalid email');

    const sms = new FormControl('x');
    sms.setErrors({ invalidSms: true });
    sms.markAsTouched();
    expect(publicRequiredFieldMessage(sms, 'Phone', messages)).toBe('Invalid phone');
  });
});
