import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  type IssueCategory,
  type IssueFormGroup,
  ResidentIssuePanel,
} from './issue-panel';

function makeIssueForm(): IssueFormGroup {
  return new FormGroup({
    category: new FormControl<IssueCategory>('water', { nonNullable: true }),
    location: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    details: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    preferredContact: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
}

const COPY = {
  issueMeta: 'Public works',
  issueTitle: 'Report an issue',
  issueBody: 'Tell public works',
  issueIcon: 'pi pi-exclamation-triangle',
  issueCategoryLabel: 'Issue type',
  issueLocationLabel: 'Location',
  issueDetailsLabel: 'What happened',
  issueNameLabel: 'Your name',
  issueContactLabel: 'Best contact',
  issueSubmitLabel: 'Send report',
  phoneFallbackLabel: 'Call Town Hall',
  emailFallbackLabel: 'Email contact',
  issueCategories: [
    { value: 'water' as const, label: 'Water' },
    { value: 'street' as const, label: 'Street' },
    { value: 'streetlight' as const, label: 'Streetlight' },
    { value: 'property' as const, label: 'Property' },
    { value: 'other' as const, label: 'Other' },
  ],
};

describe('ResidentIssuePanel', () => {
  it('renders heading and emits submit when the form is submitted', () => {
    TestBed.configureTestingModule({
      imports: [ResidentIssuePanel],
      providers: [provideAnimations()],
    });
    const fixture = TestBed.createComponent(ResidentIssuePanel);
    fixture.componentRef.setInput('copy', COPY);
    fixture.componentRef.setInput('issueForm', makeIssueForm());
    fixture.componentRef.setInput('issueSubmitting', false);
    fixture.componentRef.setInput('validationMessage', () => null);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2')?.textContent).toContain('Report an issue');

    let submitted = 0;
    fixture.componentInstance.submitIssue.subscribe(() => {
      submitted += 1;
    });
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    expect(submitted).toBe(1);
  });
});
