import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MessageModule } from 'primeng/message';
import { StaffAuthService } from '../auth/staff-auth.service';
import { DocumentUploadService } from '../document-upload.service';
import type { ClerkCmsTaskId } from './cms-clerk-tasks';

export type ClerkUploadMode = 'hero' | 'newsletter-pdf';

@Component({
  selector: 'app-cms-clerk-upload-panel',
  standalone: true,
  imports: [MessageModule],
  templateUrl: './cms-clerk-upload-panel.component.html',
  styleUrl: './cms-clerk-upload-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsClerkUploadPanelComponent {
  readonly mode = input.required<ClerkUploadMode>();

  readonly openTaskGuide = output<ClerkCmsTaskId>();

  private readonly uploads = inject(DocumentUploadService);
  private readonly staffAuth = inject(StaffAuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultMessage = signal<string | null>(null);
  protected readonly copyValue = signal<string | null>(null);
  protected readonly httpsUrl = signal<string | null>(null);

  protected readonly loginUrl = '/admin/login';

  protected taskGuideId(): ClerkCmsTaskId {
    return this.mode() === 'hero' ? 'homepage' : 'post-notice';
  }

  protected onOpenTaskGuide(): void {
    this.openTaskGuide.emit(this.taskGuideId());
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) {
      return;
    }

    this.error.set(null);
    this.resultMessage.set(null);
    this.copyValue.set(null);
    this.httpsUrl.set(null);

    await this.staffAuth.refreshSession();
    if (!this.staffAuth.isStaff()) {
      this.error.set('Sign in at /admin/login before uploading files.');
      inputEl.value = '';
      return;
    }

    this.uploading.set(true);
    try {
      if (this.mode() === 'hero') {
        const doc = await this.uploads.uploadDocument(file, 'cms-uploads/hero');
        this.httpsUrl.set(doc.url);
        this.copyValue.set(doc.url);
        this.resultMessage.set(
          'Copy the web address below into Photo web address in the homepage form (click Go to homepage task).',
        );
      } else {
        const doc = await this.uploads.uploadDocument(file, 'newsletter');
        this.copyValue.set(doc.id);
        this.resultMessage.set(
          'Copy the file code below into File code from IT on your newsletter notice form (click Go to post notice task).',
        );
      }
    } catch {
      this.error.set('Upload failed. Ask IT for help or try again after signing in.');
    } finally {
      this.uploading.set(false);
      inputEl.value = '';
      this.cdr.markForCheck();
    }
  }

  protected async copyToClipboard(): Promise<void> {
    const value = this.copyValue();
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      this.resultMessage.set('Copied to clipboard.');
    } catch {
      this.error.set('Could not copy automatically — select the text and copy manually.');
    }
  }
}
