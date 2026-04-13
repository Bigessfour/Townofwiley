import { TestBed } from '@angular/core/testing';
import { CmsPublicDocumentAdminService } from '../cms-public-document-admin.service';
import { DocumentRefreshService } from '../document-refresh.service';
import { DocumentUploadComponent } from './document-upload.component';
import { DocumentUploadService, type UploadedDocument } from '../document-upload.service';

describe('DocumentUploadComponent', () => {
  const file = new File(['upload test'], 'agenda.pdf', { type: 'application/pdf' });
  const uploadedDocument: UploadedDocument = {
    id: 'documents/meeting-documents/123-agenda.pdf',
    name: 'agenda.pdf',
    size: 1024,
    type: 'application/pdf',
    url: 'https://example.com/agenda.pdf',
    uploadedAt: new Date('2026-04-13T10:00:00-06:00'),
    sectionId: 'meeting-documents',
  };
  const existingDocument: UploadedDocument = {
    id: 'documents/meeting-documents/existing-agenda.pdf',
    name: 'existing-agenda.pdf',
    size: 2048,
    type: 'application/pdf',
    url: 'https://example.com/existing-agenda.pdf',
    uploadedAt: new Date('2026-04-13T09:00:00-06:00'),
    sectionId: 'meeting-documents',
  };

  const uploadService: {
    getDocuments: ReturnType<typeof vi.fn>;
    uploadDocument: ReturnType<typeof vi.fn>;
    deleteDocument: ReturnType<typeof vi.fn>;
  } = {
    getDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  };

  const cmsPublicDocumentAdminService: {
    createDocumentFromUpload: ReturnType<typeof vi.fn>;
  } = {
    createDocumentFromUpload: vi.fn(),
  };

  const documentRefreshService = {
    triggerRefresh: vi.fn(),
  };

  async function createFixture() {
    const fixture = TestBed.createComponent(DocumentUploadComponent);
    fixture.componentRef.setInput('sectionId', 'meeting-documents');
    fixture.componentRef.setInput('sectionName', 'Meeting Documents');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    uploadService.getDocuments.mockResolvedValue([existingDocument]);
    uploadService.uploadDocument.mockResolvedValue(uploadedDocument);
    uploadService.deleteDocument.mockResolvedValue(undefined);
    cmsPublicDocumentAdminService.createDocumentFromUpload.mockResolvedValue('public-document-id');

    TestBed.configureTestingModule({
      imports: [DocumentUploadComponent],
      providers: [
        { provide: DocumentUploadService, useValue: uploadService },
        { provide: CmsPublicDocumentAdminService, useValue: cmsPublicDocumentAdminService },
        { provide: DocumentRefreshService, useValue: documentRefreshService },
      ],
    });
  });

  afterEach(() => {
    uploadService.getDocuments.mockReset();
    uploadService.uploadDocument.mockReset();
    uploadService.deleteDocument.mockReset();
    cmsPublicDocumentAdminService.createDocumentFromUpload.mockReset();
    documentRefreshService.triggerRefresh.mockReset();
  });

  it('shows the intended section and current uploaded documents', async () => {
    const fixture = await createFixture();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.section-callout strong')?.textContent).toContain(
      'Meeting Documents',
    );
    expect(compiled.textContent).toContain('Documents currently uploaded to Meeting Documents');
    expect(compiled.textContent).toContain('existing-agenda.pdf');
    expect(compiled.textContent).toContain('Remove from website');
  });

  it('uploads files, creates the public document record, and refreshes the list', async () => {
    uploadService.getDocuments.mockResolvedValueOnce([existingDocument]).mockResolvedValueOnce([
      uploadedDocument,
    ]);

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component.selectedFiles = [file];

    await component.uploadFiles();

    expect(uploadService.uploadDocument).toHaveBeenCalledWith(file, 'meeting-documents');
    expect(cmsPublicDocumentAdminService.createDocumentFromUpload).toHaveBeenCalledWith(
      uploadedDocument,
      'meeting-documents',
    );
    expect(documentRefreshService.triggerRefresh).toHaveBeenCalledTimes(1);
    expect(uploadService.getDocuments).toHaveBeenCalledWith('meeting-documents');
    expect(component.selectedFiles).toEqual([]);
    expect(component.uploadedDocuments()).toEqual([uploadedDocument]);
    expect(component.statusMessage()).toBe('Uploaded 1 file to Meeting Documents.');
    expect(component.errorMessage()).toBeNull();
  });

  it('rolls back an uploaded file when public record creation fails', async () => {
    uploadService.uploadDocument.mockResolvedValue(uploadedDocument);
    cmsPublicDocumentAdminService.createDocumentFromUpload.mockRejectedValue(
      new Error('Not authorized to access createPublicDocument on type Mutation'),
    );

    const fixture = await createFixture();
    const component = fixture.componentInstance;
    component.selectedFiles = [file];

    await component.uploadFiles();
    fixture.detectChanges();

    expect(uploadService.uploadDocument).toHaveBeenCalledWith(file, 'meeting-documents');
    expect(cmsPublicDocumentAdminService.createDocumentFromUpload).toHaveBeenCalledWith(
      uploadedDocument,
      'meeting-documents',
    );
    expect(uploadService.deleteDocument).toHaveBeenCalledWith(uploadedDocument.id);
    expect(documentRefreshService.triggerRefresh).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain(
      'The file upload reached storage, but the PublicDocument database record could not be created.',
    );
    expect(component.errorMessage()).toContain(
      'Confirm you are using the Town AWS editor account and that document upload permissions are available.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'The file upload reached storage, but the PublicDocument database record could not be created.',
    );
  });

  it('removes an uploaded document and reloads the section list', async () => {
    uploadService.getDocuments.mockResolvedValueOnce([existingDocument]).mockResolvedValueOnce([]);

    const fixture = await createFixture();
    const component = fixture.componentInstance;

    await component.deleteDocument(existingDocument);
    fixture.detectChanges();

    expect(uploadService.deleteDocument).toHaveBeenCalledWith(existingDocument.id);
    expect(component.uploadedDocuments()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'No documents have been uploaded to this section yet.',
    );
  });
});