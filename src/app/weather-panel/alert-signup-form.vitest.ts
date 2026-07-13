import { describe, expect, it } from 'vitest';
import { createAlertSignupForm } from './alert-signup-form';

describe('createAlertSignupForm', () => {
  it('requires a valid SMS destination when channel is sms', () => {
    const form = createAlertSignupForm();
    form.controls.destination.setValue('123');
    expect(form.controls.destination.valid).toBe(false);

    form.controls.destination.setValue('7195550102');
    expect(form.controls.destination.valid).toBe(true);
  });

  it('requires a valid email destination when channel is email', () => {
    const form = createAlertSignupForm();
    form.controls.channel.setValue('email');
    form.controls.destination.setValue('not-an-email');
    expect(form.controls.destination.valid).toBe(false);

    form.controls.destination.setValue('resident@example.com');
    expect(form.controls.destination.valid).toBe(true);
  });
});