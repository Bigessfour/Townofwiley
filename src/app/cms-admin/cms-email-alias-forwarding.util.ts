import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const TOWN_MAIL_DOMAIN = 'townofwiley.gov';

/** Clerks may type `steve.mckitrick` or the full Town address. */
export function normalizeTownAliasAddress(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return trimmed;
  }
  if (!trimmed.includes('@')) {
    return `${trimmed}@${TOWN_MAIL_DOMAIN}`;
  }
  return trimmed;
}

export function townAliasAddressValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = normalizeTownAliasAddress(String(control.value ?? ''));
    if (!value) {
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { email: true };
    }
    if (!value.endsWith(`@${TOWN_MAIL_DOMAIN}`)) {
      return { townDomain: true };
    }
    return null;
  };
}

/** Staff inbox must be a real mailbox — not another @townofwiley.gov address (loops AWS). */
export function destinationInboxValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '')
      .trim()
      .toLowerCase();
    if (!value) {
      return null;
    }
    if (value.endsWith(`@${TOWN_MAIL_DOMAIN}`)) {
      return { townLoop: true };
    }
    return null;
  };
}