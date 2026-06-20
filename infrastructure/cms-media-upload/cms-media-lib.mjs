const DOCUMENTS_BUCKET = process.env.DOCUMENTS_BUCKET ?? 'townofwiley-documents-storage-main';
const STATIC_SITE_BUCKET = process.env.STATIC_SITE_BUCKET ?? 'townofwiley-static-site';

const SECTION_RULES = {
  'cms-uploads/hero': {
    bucket: STATIC_SITE_BUCKET,
    keyPrefix: 'media/cms/hero',
    cfPaths: ['/media/cms/hero/*', '/index.html'],
    usePublicSiteUrl: true,
  },
  newsletter: {
    bucket: DOCUMENTS_BUCKET,
    keyPrefix: 'documents/newsletter',
    cfPaths: ['/news/index.html', '/news/*'],
  },
  'meeting-documents': {
    bucket: DOCUMENTS_BUCKET,
    keyPrefix: 'documents/meeting-documents',
    cfPaths: ['/meetings/index.html', '/meetings/*'],
  },
};

export function sanitizeUploadFileName(originalName) {
  const trimmed = String(originalName ?? '').trim() || 'document';
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

export function resolveSectionRule(sectionId) {
  const normalized = String(sectionId ?? '').trim() || 'cms-uploads';
  if (SECTION_RULES[normalized]) {
    return { sectionId: normalized, ...SECTION_RULES[normalized] };
  }
  return {
    sectionId: normalized,
    bucket: DOCUMENTS_BUCKET,
    keyPrefix: `documents/${normalized}`,
    cfPaths: [],
    usePublicSiteUrl: false,
  };
}

export function buildStorageKey(sectionId, fileName) {
  const rule = resolveSectionRule(sectionId);
  const safeName = `${Date.now()}-${sanitizeUploadFileName(fileName)}`;
  return `${rule.keyPrefix}/${safeName}`;
}

export function resolveBucketForKey(storageKey) {
  if (storageKey.startsWith('media/cms/')) {
    return STATIC_SITE_BUCKET;
  }
  return DOCUMENTS_BUCKET;
}
