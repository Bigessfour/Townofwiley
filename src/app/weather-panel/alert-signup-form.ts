import { AbstractControl, FormControl, FormGroup, ValidatorFn } from '@angular/forms';

export type AlertSignupChannel = 'email' | 'sms';
export type AlertLanguage = 'en' | 'es';

export const EMAIL_DESTINATION_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SMS_DESTINATION_PATTERN = /^1?\d{10}$/;

export type AlertSignupFormGroup = FormGroup<{
  channel: FormControl<AlertSignupChannel>;
  preferredLanguage: FormControl<AlertLanguage>;
  destination: FormControl<string>;
  fullName: FormControl<string>;
}>;

export function createAlertDestinationValidator(
  readChannel: () => AlertSignupChannel,
): ValidatorFn {
  return (control: AbstractControl) => {
    const destination = typeof control.value === 'string' ? control.value.trim() : '';

    if (!destination) {
      return { required: true };
    }

    if (readChannel() === 'sms') {
      return SMS_DESTINATION_PATTERN.test(destination.replace(/\D/g, ''))
        ? null
        : { invalidSms: true };
    }

    return EMAIL_DESTINATION_PATTERN.test(destination) ? null : { invalidEmail: true };
  };
}

export function createAlertSignupForm(): AlertSignupFormGroup {
  const channelControl = new FormControl<AlertSignupChannel>('sms', { nonNullable: true });

  return new FormGroup({
    channel: channelControl,
    preferredLanguage: new FormControl<AlertLanguage>('en', { nonNullable: true }),
    destination: new FormControl('', {
      nonNullable: true,
      validators: [createAlertDestinationValidator(() => channelControl.value)],
    }),
    fullName: new FormControl('', { nonNullable: true }),
  });
}