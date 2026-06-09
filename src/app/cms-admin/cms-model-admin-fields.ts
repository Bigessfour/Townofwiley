/** GraphQL list/update field selections and naming helpers for clerk CMS editors. */

export const CMS_MODEL_LIST_FIELDS: Record<string, readonly string[]> = {
  Announcement: [
    'id',
    'title',
    'detail',
    'date',
    'announcementKind',
    'attachmentKey',
    'priority',
    'imageUrl',
    'active',
  ],
  Event: ['id', 'title', 'start', 'end', 'location', 'description', 'active'],
  SiteSettings: [
    'id',
    'townName',
    'officeHours',
    'address',
    'phone',
    'email',
    'pageTitle',
    'heroEyebrow',
    'heroStatus',
    'heroTitle',
    'heroMessage',
    'heroSubtext',
    'heroImageUrl',
    'welcomeLabel',
    'welcomeHeading',
    'welcomeBody',
    'welcomeCaption',
  ],
  AlertBanner: ['id', 'enabled', 'label', 'title', 'detail', 'linkLabel', 'linkHref'],
  PublicDocument: [
    'id',
    'title',
    'titleEs',
    'summary',
    'summaryEs',
    'sectionId',
    'href',
    'downloadFileName',
    'status',
    'format',
    'keywords',
    'displayOrder',
    'active',
  ],
  OfficialContact: ['id', 'label', 'value', 'detail', 'href', 'linkLabel', 'displayOrder'],
  LeadershipRosterEntry: ['id', 'groupId', 'lineEn', 'lineEs', 'displayOrder', 'active'],
  Business: [
    'id',
    'name',
    'phone',
    'address',
    'website',
    'description',
    'imageUrl',
    'displayOrder',
    'active',
  ],
  ExternalNewsLink: ['id', 'title', 'url', 'source', 'displayOrder', 'active'],
  SiteCopy: ['id', 'key', 'valueEn', 'valueEs', 'description', 'displayOrder', 'active'],
};

/** Models with at most one live row — editor loads it automatically instead of a pick list. */
export const CMS_SINGLETON_MODELS = new Set(['SiteSettings']);

const LIST_QUERY_FIELD: Record<string, string> = {
  Announcement: 'listAnnouncements',
  Event: 'listEvents',
  SiteSettings: 'listSiteSettings',
  AlertBanner: 'listAlertBanners',
  PublicDocument: 'listPublicDocuments',
  OfficialContact: 'listOfficialContacts',
  LeadershipRosterEntry: 'listLeadershipRosterEntries',
  Business: 'listBusinesses',
  ExternalNewsLink: 'listExternalNewsLinks',
  SiteCopy: 'listSiteCopies',
};

const CREATE_MUTATION_FIELD: Record<string, string> = {
  Announcement: 'createAnnouncement',
  Event: 'createEvent',
  SiteSettings: 'createSiteSettings',
  AlertBanner: 'createAlertBanner',
  PublicDocument: 'createPublicDocument',
  OfficialContact: 'createOfficialContact',
  LeadershipRosterEntry: 'createLeadershipRosterEntry',
  Business: 'createBusiness',
  ExternalNewsLink: 'createExternalNewsLink',
  SiteCopy: 'createSiteCopy',
};

const UPDATE_MUTATION_FIELD: Record<string, string> = {
  Announcement: 'updateAnnouncement',
  Event: 'updateEvent',
  SiteSettings: 'updateSiteSettings',
  AlertBanner: 'updateAlertBanner',
  PublicDocument: 'updatePublicDocument',
  OfficialContact: 'updateOfficialContact',
  LeadershipRosterEntry: 'updateLeadershipRosterEntry',
  Business: 'updateBusiness',
  ExternalNewsLink: 'updateExternalNewsLink',
  SiteCopy: 'updateSiteCopy',
};

const DELETE_MUTATION_FIELD: Record<string, string> = {
  Announcement: 'deleteAnnouncement',
  Event: 'deleteEvent',
  SiteSettings: 'deleteSiteSettings',
  AlertBanner: 'deleteAlertBanner',
  PublicDocument: 'deletePublicDocument',
  OfficialContact: 'deleteOfficialContact',
  LeadershipRosterEntry: 'deleteLeadershipRosterEntry',
  Business: 'deleteBusiness',
  ExternalNewsLink: 'deleteExternalNewsLink',
  SiteCopy: 'deleteSiteCopy',
};

export function cmsListQueryField(model: string): string {
  const field = LIST_QUERY_FIELD[model];
  if (!field) {
    throw new Error(`Unsupported CMS model for list: ${model}`);
  }
  return field;
}

export function cmsCreateMutationField(model: string): string {
  const field = CREATE_MUTATION_FIELD[model];
  if (!field) {
    throw new Error(`Unsupported CMS model for create: ${model}`);
  }
  return field;
}

export function cmsUpdateMutationField(model: string): string {
  const field = UPDATE_MUTATION_FIELD[model];
  if (!field) {
    throw new Error(`Unsupported CMS model for update: ${model}`);
  }
  return field;
}

export function cmsCreateInputType(model: string): string {
  return `Create${model}Input`;
}

export function cmsUpdateInputType(model: string): string {
  return `Update${model}Input`;
}

export function cmsDeleteMutationField(model: string): string {
  const field = DELETE_MUTATION_FIELD[model];
  if (!field) {
    throw new Error(`Unsupported CMS model for delete: ${model}`);
  }
  return field;
}

export function cmsDeleteInputType(model: string): string {
  return `Delete${model}Input`;
}

/** Short label for saved-record pick lists in the clerk editor. */
export function cmsRecordSummaryLabel(model: string, record: Record<string, unknown>): string {
  switch (model) {
    case 'Announcement':
    case 'Event':
    case 'AlertBanner':
    case 'PublicDocument':
    case 'ExternalNewsLink':
      return String(record['title'] ?? record['id'] ?? 'Record');
    case 'OfficialContact':
      return `${record['label'] ?? 'Contact'} (${record['id'] ?? 'id'})`;
    case 'LeadershipRosterEntry':
      return String(record['lineEn'] ?? record['id'] ?? 'Roster line');
    case 'Business':
      return String(record['name'] ?? record['id'] ?? 'Business');
    case 'SiteCopy':
      return String(record['key'] ?? record['id'] ?? 'Copy key');
    case 'SiteSettings':
      return String(record['townName'] ?? 'Site settings');
    default:
      return String(record['id'] ?? 'Record');
  }
}