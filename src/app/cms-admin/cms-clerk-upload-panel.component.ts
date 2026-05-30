import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { MessageModule } from 'primeng/message';
import { StaffAuthService } from '../auth/staff-auth.service';
import { DocumentUploadService } from '../document-upload.service';
import { clerkTaskEditorUrl } from './cms-clerk-tasks';

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
  readonly region = input.required<string>();
  readonly appId = input.required<string>();
  readonly branch = input('main');
  readonly fallbackEditorUrl = input.required<string>();

  private readonly uploads = inject(DocumentUploadService);
  private readonly staffAuth = inject(StaffAuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultMessage = signal<string | null>(null);
  protected readonly copyValue = signal<string | null>(null);
  protected readonly httpsUrl = signal<string | null>(null);

  protected readonly loginUrl = '/admin/login';

  protected editorUrlForMode(): string {
    const model = this.mode() === 'hero' ? 'SiteSettings' : 'Announcement';
    return clerkTaskEditorUrl(
      this.region(),
      this.appId(),
      this.branch(),
      model,
      this.fallbackEditorUrl(),
    );
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
          'Copy the web address below into Photo web address (heroImageUrl) in Homepage settings.',
        );
      } else {
        const doc = await this.uploads.uploadDocument(file, 'newsletter');
        this.copyValue.set(doc.id);
        this.resultMessage.set(
          'Copy the file code below into File code from IT (attachmentKey) on your newsletter Announcement row.',
        );
      }
    } catch {
      this.error.set('Upload failed. Ask IT for help or use the editor without an upload.');
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
