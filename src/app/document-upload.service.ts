import { inject, Injectable } from '@angular/core';
import { getUrl, list, remove, uploadData } from '@aws-amplify/storage';
import {
  ensureAdminRuntimeConfigLoaded,
  readAdminRuntimeConfig,
} from './admin-runtime-config';
import { isDurablePublicHeroImageUrl, isEphemeralCmsAssetUrl } from './cms-public-asset-url';
import { StaffAuthService } from './auth/staff-auth.service';

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  /** Stable public URL when uploaded to the static site bucket (hero images). */
  publicUrl?: string;
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

  /**
   * Hero and other public-site media must land on a durable URL (static site /media/…).
   * Amplify Storage getUrl() only yields short-lived presigns — never fall back for those sections.
   */
  private requiresDurablePublicUrl(sectionId: string): boolean {
    return sectionId === 'cms-uploads/hero' || sectionId.startsWith('cms-uploads/hero/');
  }

  async uploadDocument(file: File, sectionId: string): Promise<UploadedDocument> {
    await ensureAdminRuntimeConfigLoaded();
    const mediaUploadEndpoint = this.readMediaUploadEndpoint();
    const needsPublicUrl = this.requiresDurablePublicUrl(sectionId);

    if (mediaUploadEndpoint && !this.staffAuth.playwrightStaffBypassActive()) {
      try {
        const uploaded = await this.uploadDocumentViaPresignedUrl(
          file,
          sectionId,
          mediaUploadEndpoint,
        );
        if (needsPublicUrl) {
          const publicUrl = uploaded.publicUrl?.trim() ?? '';
          if (!isDurablePublicHeroImageUrl(publicUrl) || isEphemeralCmsAssetUrl(publicUrl)) {
            throw new Error(
              'Media upload succeeded but did not return a durable public URL for the homepage photo.',
            );
          }
        }
        return uploaded;
      } catch (error) {
        if (needsPublicUrl) {
          // Do not fall back to Amplify Storage — that path only produces temporary S3 URLs.
          throw error instanceof Error
            ? error
            : new Error('Homepage photo upload failed. Sign in again and try once more.');
        }
        console.warn('Presigned CMS upload failed; falling back to Amplify Storage.', error);
      }
    }

    if (needsPublicUrl) {
      throw new Error(
        'Homepage photo upload is not configured (missing staff media upload endpoint). Contact IT.',
      );
    }

    return this.uploadDocumentViaAmplifyStorage(file, sectionId);
  }

  private readMediaUploadEndpoint(): string {
    const legacyPublic = (
      window as Window & {
        __TOW_RUNTIME_CONFIG__?: { cms?: { mediaUpload?: { apiEndpoint?: string } } };
      }
    ).__TOW_RUNTIME_CONFIG__?.cms?.mediaUpload?.apiEndpoint;
    const adminEndpoint = readAdminRuntimeConfig()?.cms?.mediaUpload?.apiEndpoint;
    return (adminEndpoint ?? legacyPublic)?.trim() ?? '';
  }

  private async uploadDocumentViaPresignedUrl(
    file: File,
    sectionId: string,
    apiEndpoint: string,
  ): Promise<UploadedDocument> {
    await this.staffAuth.ensureIdentityCredentials();
    await this.staffAuth.refreshSession({ forceRefresh: true });
    const accessToken = this.staffAuth.accessToken();
    if (!accessToken) {
      throw new Error('Staff access token unavailable.');
    }

    const baseUrl = apiEndpoint.replace(/\/$/, '');
    const presignResponse = await fetch(`${baseUrl}/presign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sectionId,
        fileName: file.name,
        contentType: file.type || this.getFileType(file.name),
      }),
    });

    if (!presignResponse.ok) {
      throw new Error(`Presign request failed (${presignResponse.status}).`);
    }

    const presignPayload = (await presignResponse.json()) as {
      storageKey?: string;
      uploadUrl?: string;
      publicUrl?: string;
    };
    const storageKey = presignPayload.storageKey?.trim();
    const uploadUrl = presignPayload.uploadUrl?.trim();
    if (!storageKey || !uploadUrl) {
      throw new Error('Presign response missing storageKey or uploadUrl.');
    }

    const putResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || this.getFileType(file.name),
      },
      body: file,
    });
    if (!putResponse.ok) {
      throw new Error(`S3 upload failed (${putResponse.status}).`);
    }

    const completeResponse = await fetch(`${baseUrl}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storageKey, sectionId }),
    });
    if (!completeResponse.ok) {
      throw new Error(`Upload complete callback failed (${completeResponse.status}).`);
    }

    const publicUrl = presignPayload.publicUrl?.trim();
    const resolvedUrl = publicUrl || uploadUrl.split('?')[0] || uploadUrl;

    return {
      id: storageKey,
      name: file.name,
      size: file.size,
      type: file.type || this.getFileType(file.name),
      url: resolvedUrl,
      publicUrl: publicUrl || undefined,
      uploadedAt: new Date(),
      sectionId,
    };
  }

  private async uploadDocumentViaAmplifyStorage(
    file: File,
    sectionId: string,
  ): Promise<UploadedDocument> {
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
