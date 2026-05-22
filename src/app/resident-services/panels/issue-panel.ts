import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { Ripple } from 'primeng/ripple';

export type IssueCategory = 'water' | 'street' | 'streetlight' | 'property' | 'other';

export type IssueFormGroup = FormGroup<{
  category: FormControl<IssueCategory>;
  location: FormControl<string>;
  details: FormControl<string>;
  name: FormControl<string>;
  preferredContact: FormControl<string>;
}>;

export interface IssuePanelCopy {
  issueMeta: string;
  issueTitle: string;
  issueBody: string;
  issueIcon: string;
  issueCategoryLabel: string;
  issueLocationLabel: string;
  issueDetailsLabel: string;
  issueNameLabel: string;
  issueContactLabel: string;
  issueSubmitLabel: string;
  phoneFallbackLabel: string;
  emailFallbackLabel: string;
  issueCategories: { value: IssueCategory; label: string }[];
}

@Component({
  selector: 'app-resident-issue-panel',
  imports: [
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    ReactiveFormsModule,
    Ripple,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './issue-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentIssuePanel {
  readonly copy = input.required<IssuePanelCopy>();
  readonly issueForm = input.required<IssueFormGroup>();
  readonly issueSubmitting = input.required<boolean>();
  readonly townHallPhoneHref = input<string | null>(null);
  readonly townHallPhoneLabel = input<string>('');
  readonly superintendentEmailHref = input<string | null>(null);
  readonly superintendentEmailLabel = input<string>('');
  readonly validationMessage =
    input.required<(control: AbstractControl, fieldLabel: string) => string | null>();

  readonly submitIssue = output<void>();

  protected onSubmit(): void {
    this.submitIssue.emit();
  }
}
