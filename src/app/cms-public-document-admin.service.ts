import { Injectable } from '@angular/core';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient, type GraphQLResult } from 'aws-amplify/api';
import { type DocumentArchiveSectionId } from './document-hub/document-archive';
import { type UploadedDocument } from './document-upload.service';
import {
  eventDocumentKeyword,
  formatMeetingDocumentSummary,
  formatMeetingDocumentTitle,
} from './public-document-event-link';

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

export interface MeetingDocumentUploadContext {
  eventId: string;
  eventTitle: string;
  eventStart: string;
  locale: string;
}

@Injectable({
  providedIn: 'root',
})
export class CmsPublicDocumentAdminService {
  async createDocumentFromUpload(
    document: UploadedDocument,
    sectionId: DocumentArchiveSectionId,
    meetingContext?: MeetingDocumentUploadContext,
  ): Promise<string> {
    const title = meetingContext
      ? formatMeetingDocumentTitle(
          meetingContext.eventTitle,
          meetingContext.eventStart,
          meetingContext.locale,
        )
      : this.toDisplayTitle(document.name);
    const summary = meetingContext
      ? formatMeetingDocumentSummary(
          meetingContext.eventTitle,
          meetingContext.eventStart,
          meetingContext.locale,
        )
      : SECTION_SUMMARY[sectionId];
    const keywords = meetingContext
      ? this.toMeetingKeywords(document.name, sectionId, meetingContext)
      : this.toKeywords(document.name, sectionId);

    const response = (await client.graphql({
      query: CREATE_PUBLIC_DOCUMENT_MUTATION,
      variables: {
        input: {
          title,
          summary,
          sectionId,
          status: 'Published',
          format: this.toDisplayFormat(document.type, document.name),
          href: this.toStorageHref(document.id),
          downloadFileName: document.name,
          keywords,
          displayOrder: meetingContext
            ? this.toMeetingDisplayOrder(meetingContext.eventStart)
            : undefined,
          active: true,
        },
      },
      authMode: await this.resolveStaffAuthMode(),
    })) as GraphQLResult<CreatePublicDocumentResult>;

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
    const titleTerms = this.toDisplayTitle(fileName).toLowerCase().split(' ').filter(Boolean);

    return Array.from(new Set([sectionId, 'uploaded', 'cms', ...titleTerms]));
  }

  private toMeetingKeywords(
    fileName: string,
    sectionId: DocumentArchiveSectionId,
    meetingContext: MeetingDocumentUploadContext,
  ): string[] {
    const base = this.toKeywords(fileName, sectionId);
    const eventDate = meetingContext.eventStart.slice(0, 10);

    return Array.from(
      new Set([
        ...base,
        'agenda',
        eventDocumentKeyword(meetingContext.eventId),
        ...(eventDate ? [eventDate] : []),
      ]),
    );
  }

  private toMeetingDisplayOrder(eventStartIso: string): number | undefined {
    const parsed = Date.parse(eventStartIso);
    if (Number.isNaN(parsed)) {
      return undefined;
    }

    return Math.floor(parsed / 1000);
  }

  private async resolveStaffAuthMode(): Promise<'userPool' | 'iam'> {
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.accessToken) {
        return 'userPool';
      }
    } catch {
      // Fall back to guest identity pool credentials when no staff session exists.
    }

    return 'iam';
  }
}
