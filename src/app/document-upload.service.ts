import { inject, Injectable } from '@angular/core';
import { getUrl, list, remove, uploadData } from '@aws-amplify/storage';
import { StaffAuthService } from './auth/staff-auth.service';

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
  private readonly staffAuth = inject(StaffAuthService);

  async resolveDocumentHref(href: string): Promise<string> {
    const storageKey = this.getStorageKeyFromHref(href);
    if (!storageKey) {
      return href;
    }

    // Use `path` (not deprecated `key`) so Amplify does not prepend `public/` to CMS keys
    // such as `documents/newsletter/...` (see Amplify resolvePrefix + STORAGE_INPUT_KEY).
    const candidatePaths = this.storagePathCandidates(storageKey);
    let lastError: unknown;
    for (const path of candidatePaths) {
      try {
        const urlResult = await getUrl({ path });
        return urlResult.url.toString();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  /** Primary CMS path plus legacy Amplify `key` uploads under `public/`. */
  private storagePathCandidates(storageKey: string): string[] {
    const normalized = storageKey.trim();
    const candidates = [normalized];
    if (!normalized.startsWith('public/')) {
      candidates.push(`public/${normalized}`);
    }
    return candidates;
  }

  private sanitizeUploadFileName(originalName: string): string {
    const trimmed = originalName.trim() || 'document';
    const extensionIndex = trimmed.lastIndexOf('.');
    const baseName = extensionIndex >= 0 ? trimmed.slice(0, extensionIndex) : trimmed;
    const extension = extensionIndex >= 0 ? trimmed.slice(extensionIndex).toLowerCase() : '';
    const safeBase = baseName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return `${safeBase || 'document'}${extension}`;
  }

  getStorageKeyFromHref(href: string | null | undefined): string | null {
    if (!href) {
      return null;
    }

    if (href.startsWith('storage:')) {
      return href.slice('storage:'.length);
    }

    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('/') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      return null;
    }

    return href;
  }

  async uploadDocument(file: File, sectionId: string): Promise<UploadedDocument> {
    const fileName = `${Date.now()}-${this.sanitizeUploadFileName(file.name)}`;
    const storagePath = `documents/${sectionId}/${fileName}`;

    try {
      await this.staffAuth.ensureIdentityCredentials();
      await uploadData({
        path: storagePath,
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

      const urlResult = await getUrl({ path: storagePath });

      return {
        id: storagePath,
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
        path: prefix,
      });

      const documents: UploadedDocument[] = [];

      for (const item of result.items) {
        const itemPath = item.path;
        if (itemPath && item.size && item.size > 0) {
          try {
            const urlResult = await getUrl({ path: itemPath });

            documents.push({
              id: itemPath,
              name: itemPath.split('/').pop() || 'Unknown',
              size: item.size,
              type: this.getFileType(itemPath),
              url: urlResult.url.toString(),
              uploadedAt: item.lastModified || new Date(),
              sectionId: sectionId || 'general',
            });
          } catch (error) {
            console.error(`Error getting URL for ${itemPath}:`, error);
          }
        }
      }

      return documents.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
    } catch (error) {
      console.error('Error listing documents:', error);
      return [];
    }
  }

  async deleteDocument(storagePath: string): Promise<void> {
    try {
      await this.staffAuth.ensureIdentityCredentials();
      await remove({ path: storagePath });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
    };
    return typeMap[extension || ''] || 'application/octet-stream';
  }
}
