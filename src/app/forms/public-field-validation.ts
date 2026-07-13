import { AbstractControl } from '@angular/forms';

export function publicRequiredFieldMessage(
  control: AbstractControl,
  fieldLabel: string,
  messages: {
    requiredFieldMessage: string;
    invalidEmailMessage?: string;
    invalidSmsMessage?: string;
  },
): string | null {
  if (!control.invalid || !control.touched) {
    return null;
  }

  if (control.hasError('invalidEmail') || control.hasError('email')) {
    return messages.invalidEmailMessage ?? messages.requiredFieldMessage;
  }

  if (control.hasError('invalidSms')) {
    return messages.invalidSmsMessage ?? messages.requiredFieldMessage;
  }

  if (control.hasError('required')) {
    return `${fieldLabel}: ${messages.requiredFieldMessage}`;
  }

  return messages.requiredFieldMessage;
}