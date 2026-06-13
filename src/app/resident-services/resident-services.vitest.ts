import { FormControl, FormGroup, Validators } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { ResidentServices } from './resident-services';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ResidentServicesHarness = any;

function createHarness(): ResidentServicesHarness {
  const component = Object.create(ResidentServices.prototype) as ResidentServicesHarness;

  component.issueForm = new FormGroup({
    category: new FormControl('streetlight', { nonNullable: true }),
    location: new FormControl('210 Main Street', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    details: new FormControl('The streetlight at the corner is out.', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    name: new FormControl('Jordan Resident', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    preferredContact: new FormControl('jordan@example.com', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  component.copy = () =>
    ({
      validationMessage:
        'Complete the required fields so the site can prepare the message with the right details.',
      requiredFieldMessage: 'This field is required.',
      invalidEmailMessage: 'Enter a valid email address.',
      issueSubject: 'Town issue report',
      recordsSubject: 'Records or clerk request',
      issueCategoryLabel: 'Issue type',
      issueLocationLabel: 'Location',
      issueDetailsLabel: 'What happened',
      issueNameLabel: 'Resident name',
      issueContactLabel: 'Best phone or email for follow-up',
      recordsTypeLabel: 'Request type',
      recordsNameLabel: 'Resident or business name',
      recordsContactLabel: 'Best phone or email for reply',
      recordsDeadlineLabel: 'Requested deadline or meeting date',
      recordsDetailsLabel: 'Records or clerk request details',
      issueCategories: [
        { value: 'water', label: 'Water or sewer' },
        { value: 'streetlight', label: 'Streetlight or signage' },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component.validationMessage = (ResidentServices.prototype as any).validationMessage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component.buildIssueMailtoHref = (ResidentServices.prototype as any).buildIssueMailtoHref;

  component.issueFormValue = () => component.issueForm.getRawValue();
  component.superintendentContact = () => ({
    href: 'mailto:scott.whitman@townofwiley.gov',
    value: 'Scott Whitman',
    linkLabel: 'Town Superintendent',
  });
  component.siteLanguageService = {
    currentLanguage: () => 'en',
  };
  component.lang = () => 'en';

  return component;
}

describe('ResidentServices validation helpers', () => {
  it('returns required message for touched empty controls', () => {
    const component = createHarness();
    const control = new FormControl('', { validators: [Validators.required], nonNullable: true });
    control.markAsTouched();
    control.setErrors({ required: true });

    expect(component.validationMessage(control, 'Location')).toBe(
      'Location: This field is required.',
    );
  });
});

describe('ResidentServices mailto flows', () => {
  it('builds issue mailto href with the correct recipient and labels', () => {
    const component = createHarness();

    const issueHref = component.buildIssueMailtoHref();

    expect(issueHref).toContain('mailto:scott.whitman@townofwiley.gov');
    expect(issueHref).toContain('subject=Town+issue+report+%7C+Streetlight+or+signage');
    expect(issueHref).toContain('Issue+type%3A+Streetlight+or+signage');
    expect(issueHref).toContain('Location%3A+210+Main+Street');
  });
});
