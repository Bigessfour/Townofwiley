import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  destinationInboxValidator,
  normalizeTownAliasAddress,
  townAliasAddressValidator,
} from './cms-email-alias-forwarding.util';

describe('cms-email-alias-forwarding.util', () => {
  it('normalizeTownAliasAddress appends Town domain when @ is omitted', () => {
    expect(normalizeTownAliasAddress('Steve.McKitrick')).toBe('steve.mckitrick@townofwiley.gov');
    expect(normalizeTownAliasAddress('clerk@townofwiley.gov')).toBe('clerk@townofwiley.gov');
  });

  it('townAliasAddressValidator requires @townofwiley.gov', () => {
    const control = new FormControl('clerk@example.com', townAliasAddressValidator());
    expect(control.errors).toEqual({ townDomain: true });
    control.setValue('clerk@townofwiley.gov');
    expect(control.errors).toBeNull();
  });

  it('destinationInboxValidator rejects Town addresses', () => {
    const control = new FormControl('clerk@townofwiley.gov', destinationInboxValidator());
    expect(control.errors).toEqual({ townLoop: true });
    control.setValue('bigessfour@gmail.com');
    expect(control.errors).toBeNull();
  });
});