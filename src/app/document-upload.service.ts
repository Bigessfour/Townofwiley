import { Injectable } from '@angular/core';
import { uploadData, getUrl, list, remove } from '@aws-amplify/storage';

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  sectionId: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentUploadService {
  async resolveDocumentHref(href: string): Promise<string> {
    const storageKey = this.getStorageKeyFromHref(href);
    if (!storageKey) {
      return href;
    }

    const urlResult = await getUrl({ key: storageKey });
    return urlResult.url.toString();
  }

  getStorageKeyFromHref(href: string | null | undefined): string | null {
    if (!href || !href.startsWith('storage:')) {
      return null;
    }

    return href.slice('storage:'.length);
  }

  async uploadDocument(file: File, sectionId: string): Promise<UploadedDocument> {
    const fileName = `${Date.now()}-${file.name}`;
    const key = `documents/${sectionId}/${fileName}`;

    try {
      const result = await uploadData({
        key,
        data: file,
        options: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            sectionId,
            uploadedAt: new Date().toISOString(),
          },
        },
      }).result;

      const urlResult = await getUrl({ key });

      return {
        id: key,
        name: file.name,
        size: file.size,
        type: file.type,
        url: urlResult.url.toString(),
        uploadedAt: new Date(),
        sectionId,
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  async getDocuments(sectionId?: string): Promise<UploadedDocument[]> {
    try {
      const prefix = sectionId ? `documents/${sectionId}/` : 'documents/';
      const result = await list({
        prefix,
      });

      const documents: UploadedDocument[] = [];

      for (const item of result.items) {
        if (item.key && item.size && item.size > 0) {
          try {
            const urlResult = await getUrl({ key: item.key });

            documents.push({
              id: item.key,
              name: item.key.split('/').pop() || 'Unknown',
              size: item.size,
              type: this.getFileType(item.key),
              url: urlResult.url.toString(),
              uploadedAt: item.lastModified || new Date(),
              sectionId: sectionId || 'general',
            });
          } catch (error) {
            console.error(`Error getting URL for ${item.key}:`, error);
          }
        }
      }

      return documents.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    } catch (error) {
      console.error('Error listing documents:', error);
      return [];
    }
  }

  async deleteDocument(key: string): Promise<void> {
    try {
      await remove({ key });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
    };
    return typeMap[extension || ''] || 'application/octet-stream';
  }
}