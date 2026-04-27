import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it, vi } from 'vitest';
import { AccessibilitySupport } from './accessibility-support';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AccessibilitySupportHarness = any;

function createSignalMock<T>(initialValue: T) {
  let value = initialValue;

  return {
    set: vi.fn((nextValue: T) => {
      value = nextValue;
    }),
    update: vi.fn((updater: (currentValue: T) => T) => {
      value = updater(value);
      return value;
    }),
    get: vi.fn(() => value),
    asReadonly: vi.fn(() => value),
  };
}

function createHarness(): AccessibilitySupportHarness {
  const component = Object.create(AccessibilitySupport.prototype) as AccessibilitySupportHarness;

  component.reportForm = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    preferredContact: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    pageOrDocument: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  component.copy = () => ({
    statementKicker: 'Accessibility Statement',
    statementTitle: 'Every resident should be able to use this website',
    statementBody:
      'Accessibility means that people with disabilities — including those who use screen readers, keyboard navigation, voice control, or other assistive technology — can get the same information and complete the same tasks as anyone else.',
    statementCommitments: [
      'All pages support keyboard navigation and screen reader use, with visible focus indicators and skip-to-content links.',
      'Text and documents are published in readable contrast with plain-language labels so content is usable for everyone.',
      'If you report a barrier, town staff will review it and follow up with you directly — reports are not ignored.',
    ],
    reportKicker: 'Report an Accessibility Issue',
    reportTitle: 'Having trouble using this site? Let us know.',
    reportBody:
      'If any page, document, form, or feature on this site is hard to use because of a disability or assistive technology issue, fill out this short form.',
    nameLabel: 'Your name',
    contactLabel: 'Best phone or email for follow-up',
    pageLabel: 'Page, document, or service with the barrier',
    detailsLabel: 'Describe the barrier',
    actionLabel: 'Open accessibility report email',
    validationMessage:
      'Complete the contact, page, and barrier details so the site can prepare the report.',
    mailClientMessage:
      'Your email app should open with a prepared accessibility report. If nothing happens, use the direct phone or email links below.',
    phoneFallbackLabel: 'Call Town Hall',
    emailFallbackLabel: 'Email the Clerk',
    reportSubject: 'Accessibility barrier report',
  });
  component.townInfoContact = () => ({ href: 'tel:7198294974', value: 'Town Hall', linkLabel: 'Town Hall' });
  component.clerkContact = () => ({ href: 'mailto:deb.dillon@townofwiley.gov', value: 'Town Clerk', linkLabel: 'Email the Clerk' });
  component.status = createSignalMock<string | null>(null);
  component.statusTone = createSignalMock<'error' | 'info'>('info');
  component.accessibilityMailtoHref = () => null;
  component.reportFormValue = () => component.reportForm.getRawValue();

  return component;
}

describe('AccessibilitySupport', () => {
  it('builds a barrier report mailto href from the completed form', () => {
    const component = createHarness();

    component.reportForm.patchValue({
      name: 'Jordan Resident',
      preferredContact: 'jordan@example.com',
      pageOrDocument: 'Resident Services > Issue reporting',
      details: 'The issue report controls are not reachable with keyboard navigation.',
    });

    const href = component['buildAccessibilityMailtoHref']();

    expect(href).toContain('mailto:deb.dillon@townofwiley.gov');
    expect(href).toContain('subject=Accessibility+barrier+report');
    expect(href).toContain('Your+name%3A+Jordan+Resident');
    expect(href).toContain('Best+phone+or+email+for+follow-up%3A+jordan%40example.com');
    expect(href).toContain(
      'Describe+the+barrier%3A+The+issue+report+controls+are+not+reachable+with+keyboard+navigation.',
    );
  });

  it('shows validation messaging when the report is incomplete', () => {
    const component = createHarness();
    const event = { preventDefault: vi.fn() } as unknown as Event;

    component.openAccessibilityMailto(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.reportForm.controls.preferredContact.touched).toBe(true);
    expect(component.statusTone.set).toHaveBeenCalledWith('error');
    expect(component.status.set).toHaveBeenCalledWith(
      'Complete the contact, page, and barrier details so the site can prepare the report.',
    );
  });

  it('shows the prepared-message state when the report can be sent', () => {
    const component = createHarness();
    const event = { preventDefault: vi.fn() } as unknown as Event;

    component.accessibilityMailtoHref = () => 'mailto:deb.dillon@townofwiley.gov?subject=Accessibility+barrier+report';

    component.openAccessibilityMailto(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(component.statusTone.set).toHaveBeenCalledWith('info');
    expect(component.status.set).toHaveBeenCalledWith(
      'Your email app should open with a prepared accessibility report. If nothing happens, use the direct phone or email links below.',
    );
  });
});
