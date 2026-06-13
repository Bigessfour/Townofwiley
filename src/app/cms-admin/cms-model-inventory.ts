/** Gen 1 AppSync model metadata (aligned with live CMS inventory). */

export interface CmsOrderedEditorConfig {
  /** Field rendered in the preview list (e.g. lineEn, title, name). */
  previewField: string;
  /** Numeric field used for sort + reorder persistence. */
  sortField: string;
  /** When set, preview/reorder is scoped to this field's current form value. */
  groupField?: string;
  /** Optional prefix shown before preview text in drag list (e.g. SiteCopy key). */
  prefixField?: string;
}

export interface CmsModelDefinition {
  model: string;
  publicApiKeyRead: boolean;
  routes: string;
  keyFields: string;
  emptyWarningEn?: string;
  emptyWarningEs?: string;
  ordered?: CmsOrderedEditorConfig;
}

export interface CmsInventoryModel {
  model: string;
  tableName: string;
  itemCount: number | null;
  publicApiKeyRead: boolean;
  clerkEditorModel?: boolean;
  staffUserPoolCrud?: boolean;
}

export interface CmsInventory {
  version: number;
  discoveredAt: string;
  models: CmsInventoryModel[];
  capabilities?: {
    appSyncQueriesUrl?: string;
    heroFields?: string[];
  };
}

/** @deprecated Use CmsInventoryModel */
export type Gen2CmsInventoryModel = CmsInventoryModel;

/** @deprecated Use CmsInventory */
export type Gen2CmsInventory = CmsInventory;

export const CMS_MODEL_DEFINITIONS: CmsModelDefinition[] = [
  {
    model: 'SiteSettings',
    publicApiKeyRead: true,
    routes: '/ (hero, welcome)',
    keyFields: 'heroImageUrl, heroTitle, heroMessage, welcomeHeading, townName',
    emptyWarningEn:
      'No SiteSettings row — homepage uses bundled fallback text and /hero-wiley.webp.',
    emptyWarningEs: 'Sin fila SiteSettings — la portada usa texto de respaldo y /hero-wiley.webp.',
  },
  {
    model: 'AlertBanner',
    publicApiKeyRead: true,
    routes: '/ (top strip)',
    keyFields: 'enabled, label, title, detail, linkLabel, linkHref',
    emptyWarningEn: 'No alert banner records — emergency strip hidden.',
    emptyWarningEs: 'Sin AlertBanner — la franja de emergencia permanece oculta.',
  },
  {
    model: 'Announcement',
    publicApiKeyRead: true,
    routes: '/, /notices, /news',
    keyFields: 'title, detail, date, active, priority, announcementKind, attachmentKey, imageUrl',
  },
  {
    model: 'Event',
    publicApiKeyRead: true,
    routes: '/, /meetings',
    keyFields: 'title, start, end, description, location, active',
  },
  {
    model: 'OfficialContact',
    publicApiKeyRead: true,
    routes: '/contact, footer, /services',
    keyFields: 'id (town-information, city-clerk), label, value, detail, href, displayOrder',
    emptyWarningEn:
      'Verify ids `town-information` and `city-clerk` exist or footer/services use fallbacks.',
    emptyWarningEs:
      'Verifique los id `town-information` y `city-clerk` o el sitio usara texto de respaldo.',
  },
  {
    model: 'LeadershipRosterEntry',
    publicApiKeyRead: true,
    routes: '/contact (Town Administration card + #leadership elected officials)',
    keyFields: 'groupId, lineEn, lineEs, displayOrder, active',
    emptyWarningEn:
      'No roster rows — seed LeadershipRosterEntry via /admin or scripts/seed-cms-production-data.py.',
    emptyWarningEs:
      'Sin filas — use /admin o scripts/seed-cms-production-data.py para poblar LeadershipRosterEntry.',
    ordered: {
      previewField: 'lineEn',
      sortField: 'displayOrder',
      groupField: 'groupId',
    },
  },
  {
    model: 'Business',
    publicApiKeyRead: true,
    routes: '/businesses',
    keyFields: 'name, phone, address, website, imageUrl, displayOrder, active',
    ordered: {
      previewField: 'name',
      sortField: 'displayOrder',
    },
  },
  {
    model: 'PublicDocument',
    publicApiKeyRead: true,
    routes: '/meetings',
    keyFields: 'title, titleEs, summary, sectionId, href, active, displayOrder',
    emptyWarningEn: 'No PublicDocument rows — document hub relies on archive manifest + guides.',
    emptyWarningEs: 'Sin PublicDocument — el hub usa manifiesto de archivo y guias.',
    ordered: {
      previewField: 'title',
      sortField: 'displayOrder',
      groupField: 'sectionId',
    },
  },
  {
    model: 'ExternalNewsLink',
    publicApiKeyRead: true,
    routes: '/news',
    keyFields: 'title, url, source, displayOrder, active',
    ordered: {
      previewField: 'title',
      sortField: 'displayOrder',
    },
  },
  {
    model: 'SiteCopy',
    publicApiKeyRead: true,
    routes: '/ (nav labels, headings, Quick Tasks copy)',
    keyFields: 'key, valueEn, valueEs, description, displayOrder, active',
    emptyWarningEn:
      'No SiteCopy rows — navigation labels and section headings use bundled defaults.',
    emptyWarningEs:
      'Sin filas SiteCopy — etiquetas de navegacion y titulos usan valores predeterminados.',
    ordered: {
      previewField: 'valueEn',
      sortField: 'displayOrder',
      prefixField: 'key',
    },
  },
  {
    model: 'EmailAlias',
    publicApiKeyRead: false,
    routes: '(mail routing only)',
    keyFields: 'aliasAddress, destinationAddress, active',
  },
];

export function cmsOrderedEditorConfig(model: string): CmsOrderedEditorConfig | undefined {
  return CMS_MODEL_DEFINITIONS.find((definition) => definition.model === model)?.ordered;
}

export function liveCountForModel(
  model: string,
  counts: {
    SiteSettings: number;
    AlertBanner: number;
    Announcement: number;
    Event: number;
    OfficialContact: number;
    LeadershipRosterEntry: number;
    Business: number;
    PublicDocument: number;
    ExternalNewsLink: number;
    SiteCopy: number;
  },
): number | undefined {
  if (model in counts) {
    return counts[model as keyof typeof counts];
  }
  return undefined;
}
