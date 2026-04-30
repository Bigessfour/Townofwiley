import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { ProgressBarModule } from 'primeng/progressbar';
import { CmsPublicDocumentAdminService } from '../cms-public-document-admin.service';
import { DocumentRefreshService } from '../document-refresh.service';
import { DocumentArchiveSectionId } from '../document-hub/document-archive';
import { DocumentUploadService, UploadedDocument } from '../document-upload.service';

@Component({
  selector: 'app-document-upload',
  imports: [FileUploadModule, ButtonModule, ProgressBarModule, FormsModule],
  template: `
    <div class="document-upload">
      <h3>Upload Documents</h3>
      <p class="section-callout" aria-label="Intended upload section">
        <span>Intended section</span>
        <strong>{{ sectionName() }}</strong>
      </p>
      <p class="upload-instructions">
        Select PDF, Word, Excel, or other document files to upload to the
        {{ sectionName() }} section. If a file is uploaded to the wrong section, use the remove
        action below and upload it again in the correct place.
      </p>

      @if (statusMessage()) {
        <p class="upload-status upload-status--success" aria-live="polite">
          {{ statusMessage() }}
        </p>
      }

      @if (errorMessage()) {
        <p class="upload-status upload-status--error" role="alert" aria-live="assertive">
          {{ errorMessage() }}
        </p>
      }

      <p-fileUpload
        #fileUpload
        name="documents"
        [multiple]="true"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
        [maxFileSize]="10485760"
        [auto]="false"
        [showUploadButton]="false"
        [showCancelButton]="false"
        (onSelect)="onFileSelect($event)"
        (onRemove)="onFileRemove($event)"
      >
        <ng-template pTemplate="toolbar">
          <div class="flex gap-2">
            <p-button
              label="Upload Selected Files"
              icon="pi pi-upload"
              [disabled]="selectedFiles.length === 0 || isUploading()"
              (onClick)="uploadFiles()"
            >
            </p-button>
            <p-button
              label="Clear All"
              icon="pi pi-times"
              type="button"
              severity="secondary"
              (onClick)="clearFiles()"
            >
            </p-button>
          </div>
        </ng-template>

        <ng-template pTemplate="content">
          @if (selectedFiles.length === 0) {
            <div class="empty-state">
              <i
                class="pi pi-file"
                style="font-size: 2rem; color: var(--text-color-secondary);"
              ></i>
              <p>Drag and drop files here or click to browse</p>
              <small>Supported formats: PDF, DOC, DOCX, XLS, XLSX, TXT (max 10MB each)</small>
            </div>
          } @else {
            <div class="file-list">
              @for (file of selectedFiles; track file.name) {
                <div class="file-item">
                  <i class="pi pi-file" style="color: var(--primary-color);"></i>
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">({{ formatFileSize(file.size) }})</span>
                  <p-button
                    icon="pi pi-times"
                    severity="danger"
                    text
                    rounded
                    (onClick)="removeFile(file)"
                  >
                  </p-button>
                </div>
              }
            </div>
          }
        </ng-template>
      </p-fileUpload>

      @if (isUploading()) {
        <div class="upload-progress mt-3">
          <p>Uploading {{ currentUploadIndex() + 1 }} of {{ selectedFiles.length }} files...</p>
          <p-progressBar [value]="uploadProgress()"></p-progressBar>
        </div>
      }

      @if (uploadedDocuments().length > 0) {
        <div class="uploaded-documents mt-4">
          <div class="uploaded-documents-header">
            <h4>Documents currently uploaded to {{ sectionName() }}</h4>
            <p class="uploaded-count">{{ uploadedDocuments().length }} file(s) in this section</p>
          </div>
          <div class="document-list">
            @for (doc of uploadedDocuments(); track doc.id) {
              <div class="document-item">
                <i class="pi pi-file" style="color: var(--primary-color);"></i>
                <div class="document-info">
                  <a [href]="doc.url" target="_blank" class="document-link">{{ doc.name }}</a>
                  <small class="document-meta">
                    {{ formatFileSize(doc.size) }} • Uploaded {{ formatDate(doc.uploadedAt) }}
                  </small>
                </div>
                <p-button
                  icon="pi pi-trash"
                  label="Remove from website"
                  severity="danger"
                  text
                  (onClick)="deleteDocument(doc)"
                >
                </p-button>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="uploaded-documents mt-4">
          <h4>Documents currently uploaded to {{ sectionName() }}</h4>
          <p class="empty-documents">No documents have been uploaded to this section yet.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .document-upload {
        max-width: 600px;
      }

      .section-callout {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin: 0 0 1rem;
        padding: 0.9rem 1rem;
        border-left: 4px solid var(--primary-color);
        border-radius: var(--border-radius);
        background: color-mix(in srgb, var(--primary-color) 12%, var(--surface-0));
      }

      .section-callout span {
        color: var(--primary-color);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .section-callout strong {
        color: var(--text-color);
        font-size: 1rem;
      }

      .upload-instructions {
        color: var(--text-color-secondary);
        margin-bottom: 1rem;
      }

      .upload-status {
        margin: 0 0 1rem;
        padding: 0.9rem 1rem;
        border-radius: var(--border-radius);
        border: 1px solid transparent;
        line-height: 1.5;
      }

      .upload-status--success {
        border-color: color-mix(in srgb, #166534 28%, transparent);
        background: color-mix(in srgb, #dcfce7 82%, white);
        color: #166534;
      }

      .upload-status--error {
        border-color: color-mix(in srgb, #991b1b 28%, transparent);
        background: color-mix(in srgb, #fee2e2 85%, white);
        color: #991b1b;
      }

      .empty-state {
        text-align: center;
        padding: 2rem;
        border: 2px dashed var(--surface-border);
        border-radius: var(--border-radius);
        color: var(--text-color-secondary);
      }

      .file-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .file-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--surface-section);
        border-radius: var(--border-radius);
      }

      .file-name {
        flex: 1;
        font-weight: 500;
      }

      .file-size {
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .upload-progress {
        padding: 1rem;
        background: var(--surface-card);
        border-radius: var(--border-radius);
      }

      .uploaded-documents-header {
        display: grid;
        gap: 0.25rem;
        margin-bottom: 1rem;
      }

      .uploaded-documents h4 {
        margin: 0;
        color: var(--text-color);
      }

      .uploaded-count {
        margin: 0;
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .document-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .document-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--surface-card);
        border-radius: var(--border-radius);
        border: 1px solid var(--surface-border);
      }

      .document-info {
        flex: 1;
      }

      .document-link {
        color: var(--primary-color);
        text-decoration: none;
        font-weight: 500;
      }

      .document-link:hover {
        text-decoration: underline;
      }

      .document-meta {
        color: var(--text-color-secondary);
        display: block;
        margin-top: 0.25rem;
      }

      .empty-documents {
        margin: 0;
        padding: 1rem;
        border: 1px dashed var(--surface-border);
        border-radius: var(--border-radius);
        background: var(--surface-section);
        color: var(--text-color-secondary);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentUploadComponent implements OnInit {
  private readonly cmsPublicDocumentAdminService = inject(CmsPublicDocumentAdminService);
  private readonly documentRefreshService = inject(DocumentRefreshService);
  private readonly uploadService = inject(DocumentUploadService);
  private readonly permissionGuidance =
    'Confirm you are using the Town AWS editor account and that document upload permissions are available.';

  // Inputs
  sectionId = input.required<DocumentArchiveSectionId>();
  sectionName = input.required<string>();

  // Outputs
  documentUploaded = output<UploadedDocument>();

  // State
  selectedFiles: File[] = [];
  isUploading = signal(false);
  currentUploadIndex = signal(0);
  uploadProgress = signal(0);
  uploadedDocuments = signal<UploadedDocument[]>([]);
  errorMessage = signal<string | null>(null);
  statusMessage = signal<string | null>(null);

  ngOnInit() {
    this.loadUploadedDocuments();
  }

  onFileSelect(event: { files: File[] }) {
    this.selectedFiles = [...this.selectedFiles, ...event.files];
  }

  onFileRemove(event: { file: File }) {
    this.selectedFiles = this.selectedFiles.filter((file) => file !== event.file);
  }

  removeFile(file: File) {
    this.selectedFiles = this.selectedFiles.filter((f) => f !== file);
  }

  clearFiles() {
    this.selectedFiles = [];
  }

  async uploadFiles() {
    if (this.selectedFiles.length === 0) return;

    this.errorMessage.set(null);
    this.statusMessage.set(null);
    const fileCount = this.selectedFiles.length;

    this.isUploading.set(true);
    this.currentUploadIndex.set(0);
    this.uploadProgress.set(0);

    try {
      for (let i = 0; i < this.selectedFiles.length; i++) {
        this.currentUploadIndex.set(i);
        const file = this.selectedFiles[i];

        let uploadedDoc: UploadedDocument;
        try {
          uploadedDoc = await this.uploadService.uploadDocument(file, this.sectionId());
        } catch (error) {
          throw new Error(this.describeUploadFailure(error, 'storage'), { cause: error });
        }

        try {
          await this.cmsPublicDocumentAdminService.createDocumentFromUpload(
            uploadedDoc,
            this.sectionId(),
          );
        } catch (error) {
          await this.uploadService.deleteDocument(uploadedDoc.id).catch(() => undefined);
          throw new Error(this.describeUploadFailure(error, 'database'), { cause: error });
        }

        this.documentRefreshService.triggerRefresh();
        this.documentUploaded.emit(uploadedDoc);

        this.uploadProgress.set(((i + 1) / this.selectedFiles.length) * 100);
      }

      this.selectedFiles = [];
      await this.loadUploadedDocuments();
      this.statusMessage.set(
        `Uploaded ${fileCount === 1 ? '1 file' : `${fileCount} files`} to ${this.sectionName()}.`,
      );
    } catch (error) {
      console.error('Upload failed:', error);
      this.errorMessage.set(this.toErrorMessage(error));
    } finally {
      this.isUploading.set(false);
      this.uploadProgress.set(0);
    }
  }

  async deleteDocument(doc: UploadedDocument) {
    try {
      this.errorMessage.set(null);
      this.statusMessage.set(null);
      await this.uploadService.deleteDocument(doc.id);
      await this.loadUploadedDocuments();
      this.statusMessage.set(`Removed ${doc.name} from ${this.sectionName()}.`);
    } catch (error) {
      console.error('Delete failed:', error);
      this.errorMessage.set(
        `The document could not be removed from ${this.sectionName()}. ${this.permissionGuidance}`,
      );
    }
  }

  private async loadUploadedDocuments() {
    try {
      const documents = await this.uploadService.getDocuments(this.sectionId());
      this.uploadedDocuments.set(documents);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  }

  private describeUploadFailure(error: unknown, stage: 'storage' | 'database'): string {
    const rawMessage = this.toErrorMessage(error);
    const normalizedMessage = rawMessage.toLowerCase();
    const needsPermissionHelp =
      normalizedMessage.includes('not authorized') ||
      normalizedMessage.includes('access denied') ||
      normalizedMessage.includes('credential') ||
      normalizedMessage.includes('forbidden') ||
      normalizedMessage.includes('no current user') ||
      normalizedMessage.includes('unauthorized');

    if (stage === 'storage') {
      const baseMessage = 'The file could not be uploaded to Town document storage.';
      return needsPermissionHelp
        ? `${baseMessage} ${this.permissionGuidance}`
        : `${baseMessage} ${rawMessage}`;
    }

    const baseMessage =
      'The file upload reached storage, but the PublicDocument database record could not be created. The uploaded file was rolled back, so this section still shows no documents.';

    return needsPermissionHelp
      ? `${baseMessage} ${this.permissionGuidance}`
      : `${baseMessage} ${rawMessage}`;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }

    return 'An unexpected error occurred.';
  }
}
