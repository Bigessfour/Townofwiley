import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  SiteSettings: a
    .model({
      townName: a.string().required(),
      officeHours: a.string(),
      address: a.string(),
      phone: a.phone(),
      email: a.email(),
      pageTitle: a.string(),
      heroEyebrow: a.string(),
      heroStatus: a.string(),
      heroTitle: a.string(),
      heroMessage: a.string(),
      heroSubtext: a.string(),
      heroImageUrl: a.url(),
      welcomeLabel: a.string(),
      welcomeHeading: a.string(),
      welcomeBody: a.string(),
      welcomeCaption: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  AlertBanner: a
    .model({
      enabled: a.boolean().required(),
      label: a.string().required(),
      title: a.string().required(),
      detail: a.string().required(),
      linkLabel: a.string(),
      linkHref: a.url(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  Announcement: a
    .model({
      title: a.string().required(),
      date: a.date(),
      detail: a.string().required(),
      announcementKind: a.string(),
      attachmentKey: a.string(),
      priority: a.integer(),
      imageUrl: a.url(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  Event: a
    .model({
      title: a.string().required(),
      description: a.string(),
      location: a.string(),
      start: a.datetime().required(),
      end: a.datetime(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  OfficialContact: a
    .model({
      label: a.string().required(),
      value: a.string().required(),
      detail: a.string().required(),
      href: a.string(),
      linkLabel: a.string(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  LeadershipRosterEntry: a
    .model({
      groupId: a.string().required(),
      displayOrder: a.integer(),
      lineEn: a.string().required(),
      lineEs: a.string().required(),
      active: a.boolean().required(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  EmailAlias: a
    .model({
      aliasAddress: a.email().required(),
      destinationAddress: a.email().required(),
      displayName: a.string(),
      roleLabel: a.string(),
      active: a.boolean().required(),
      notes: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  Business: a
    .model({
      name: a.string().required(),
      phone: a.string().required(),
      address: a.string().required(),
      website: a.url(),
      description: a.string(),
      imageUrl: a.url(),
      active: a.boolean().required(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  PublicDocument: a
    .model({
      title: a.string().required(),
      titleEs: a.string(),
      summary: a.string().required(),
      summaryEs: a.string(),
      sectionId: a.string().required(),
      status: a.string().required(),
      statusEs: a.string(),
      format: a.string().required(),
      href: a.string().required(),
      downloadFileName: a.string(),
      keywords: a.string().array(),
      active: a.boolean().required(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  ExternalNewsLink: a
    .model({
      title: a.string().required(),
      url: a.url().required(),
      source: a.string().required(),
      active: a.boolean().required(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),

  /**
   * Lightweight editable UI copy for frequently changing labels, headings, and task text.
   * Used to make APP_COPY / nav / topTasks / section text clerk-editable without code deploys.
   * Keys are stable identifiers (e.g. "topTasks.pay-utility.title", "nav.services", "homepage.featureHub.heading").
   * Bilingual (valueEn + optional valueEs). Falls back to bundled APP_COPY when no active CMS row exists.
   */
  SiteCopy: a
    .model({
      key: a.string().required(), // stable lookup key used by the frontend
      valueEn: a.string().required(),
      valueEs: a.string(),
      description: a.string(), // clerk-facing help text: "Where this text appears"
      active: a.boolean().required(),
      displayOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.guest().to(['read', 'create', 'update', 'delete']),
      allow.authenticated().to(['read', 'create', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  name: 'townofwiley',
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
