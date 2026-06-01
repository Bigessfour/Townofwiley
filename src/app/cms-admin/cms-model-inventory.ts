/** Gen 2 AppSync model metadata (aligned with `amplify/data/resource.ts` and AWS inventory). */

export interface CmsModelDefinition {
  model: string;
  publicApiKeyRead: boolean;
  routes: string;
  keyFields: string;
  emptyWarningEn?: string;
  emptyWarningEs?: string;
}

export interface Gen2CmsInventoryModel {
  model: string;
  tableName: string;
  itemCount: number | null;
  publicApiKeyRead: boolean;
}

export interface Gen2CmsInventory {
  version: number;
  discoveredAt: string;
  models: Gen2CmsInventoryModel[];
  capabilities?: {
    dataManagerUrl?: string;
    heroFields?: string[];
  };
}

export const CMS_MODEL_DEFINITIONS: CmsModelDefinition[] = [
  {
    model: 'SiteSettings',
    publicApiKeyRead: true,
    routes: '/ (hero, welcome)',
    keyFields: 'heroImageUrl, heroTitle, heroMessage, welcomeHeading, townName',
    emptyWarningEn: 'No SiteSettings row — homepage uses bundled fallback text and /hero-wiley.webp.',
    emptyWarningEs:
      'Sin fila SiteSettings — la portada usa texto de respaldo y /hero-wiley.webp.',
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
    routes: '/contact, footer, /services, /permits',
    keyFields: 'id (town-information, city-clerk), label, value, detail, href, displayOrder',
    emptyWarningEn:
      'Verify ids `town-information` and `city-clerk` exist or footer/permits use fallbacks.',
    emptyWarningEs:
      'Verifique los id `town-information` y `city-clerk` o el sitio usara texto de respaldo.',
  },
  {
    model: 'LeadershipRosterEntry',
    publicApiKeyRead: true,
    routes: '/contact (mayor-council, town-administration bullets)',
    keyFields: 'groupId, lineEn, lineEs, displayOrder, active',
    emptyWarningEn: 'No roster rows — /contact uses bundled leadership bullets.',
    emptyWarningEs: 'Sin filas — /contact usa viñetas de respaldo.',
  },
  {
    model: 'Business',
    publicApiKeyRead: true,
    routes: '/businesses',
    keyFields: 'name, phone, address, website, imageUrl, displayOrder, active',
  },
  {
    model: 'PublicDocument',
    publicApiKeyRead: true,
    routes: '/documents, /records',
    keyFields: 'title, titleEs, summary, sectionId, href, active, displayOrder',
    emptyWarningEn: 'No PublicDocument rows — document hub relies on archive manifest + guides.',
    emptyWarningEs: 'Sin PublicDocument — el hub usa manifiesto de archivo y guias.',
  },
  {
    model: 'ExternalNewsLink',
    publicApiKeyRead: true,
    routes: '/news',
    keyFields: 'title, url, source, displayOrder, active',
  },
  {
    model: 'EmailAlias',
    publicApiKeyRead: false,
    routes: '(mail routing only)',
    keyFields: 'aliasAddress, destinationAddress, active',
  },
];

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
  },
): number | undefined {
  if (model in counts) {
    return counts[model as keyof typeof counts];
  }
  return undefined;
}
