import { Injectable } from '@angular/core';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';
import { type DocumentArchiveSectionId } from './document-hub/document-archive';
import { type UploadedDocument } from './document-upload.service';

interface CreatePublicDocumentResult {
  createPublicDocument?: {
    id: string;
  } | null;
}

const CREATE_PUBLIC_DOCUMENT_MUTATION = /* GraphQL */ `
  mutation CreatePublicDocument($input: CreatePublicDocumentInput!) {
    createPublicDocument(input: $input) {
      id
    }
  }
`;

const SECTION_SUMMARY: Record<DocumentArchiveSectionId, string> = {
  'records-requests': 'Uploaded records and request document.',
  'meeting-documents': 'Uploaded meeting document for the public archive.',
  'financial-documents': 'Uploaded financial document for the public archive.',
  'code-references': 'Uploaded code or zoning reference for the public archive.',
};

const client = generateClient();

@Injectable({
  providedIn: 'root',
})
export class CmsPublicDocumentAdminService {
  async createDocumentFromUpload(
    document: UploadedDocument,
    sectionId: DocumentArchiveSectionId,
  ): Promise<string> {
    const response = await client.graphql({
      query: CREATE_PUBLIC_DOCUMENT_MUTATION,
      variables: {
        input: {
          title: this.toDisplayTitle(document.name),
          summary: SECTION_SUMMARY[sectionId],
          sectionId,
          status: 'Published',
          format: this.toDisplayFormat(document.type, document.name),
          href: this.toStorageHref(document.id),
          downloadFileName: document.name,
          keywords: this.toKeywords(document.name, sectionId),
          active: true,
        },
      },
      authMode: 'iam',
    }) as GraphQLResult<CreatePublicDocumentResult>;

    if (response.errors?.length) {
      throw new Error(
        response.errors
          .map((error: { message?: string | null }) => error.message?.trim())
          .filter((message: string | undefined): message is string => Boolean(message))
          .join(' '),
      );
    }

    const recordId = response.data?.createPublicDocument?.id;
    if (!recordId) {
      throw new Error('PublicDocument record was not created.');
    }

    return recordId;
  }

  toStorageHref(key: string): string {
    return `storage:${key}`;
  }

  private toDisplayTitle(fileName: string): string {
    const extensionIndex = fileName.lastIndexOf('.');
    const baseName = extensionIndex >= 0 ? fileName.slice(0, extensionIndex) : fileName;

    return baseName
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  private toDisplayFormat(mimeType: string, fileName: string): string {
    const extension = fileName.split('.').pop()?.toUpperCase();
    if (extension) {
      return extension;
    }

    const mimeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'text/plain': 'TXT',
    };

    return mimeMap[mimeType] ?? 'FILE';
  }

  private toKeywords(fileName: string, sectionId: DocumentArchiveSectionId): string[] {
    const titleTerms = this.toDisplayTitle(fileName)
      .toLowerCase()
      .split(' ')
      .filter(Boolean);

    return Array.from(new Set([sectionId, 'uploaded', 'cms', ...titleTerms]));
  }
}