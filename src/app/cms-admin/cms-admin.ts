import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  buildAmplifyAdminStudioHomeUrl,
  getClerkSetupRuntimeConfig,
} from '../clerk-setup/clerk-setup-config';
import {
  ContactUpdateRecord,
  ContactUpdateReviewService,
} from '../clerk-setup/contact-update-review.service';
import { CmsConnectionTestResult, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

/** Official AWS Amplify Gen 1 Studio overview (visual backend, Data Manager / data browser). */
export const AMPLIFY_STUDIO_GEN1_DOCS_URL =
  'https://docs.amplify.aws/gen1/angular/tools/console/';

interface CmsAdminRuntimeConfig {
  cms?: {
    appSync?: {
      region?: string;
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
}

interface CmsAdminSetupDetail {
  key: string;
  label: string;
  /** Extra context for clerks (shown as tooltip on the label). */
  labelHint?: string;
  value: string;
  copyValue: string;
}

interface CmsAdminTask {
  action: string;
  model: string;
  /** What to tap in Studio after the app opens (Data / Content, then this model). */
  hint: string;
}

interface CmsAdminDocumentSection {
  label: string;
  sectionId: string;
  detail: string;
}

interface CmsAdminCopy {
  kicker: string;
  title: string;
  intro: string;
  uploadFormKicker: string;
  uploadFormTitle: string;
  uploadFormBody: string;
  returnHome: string;
  openPublicDocumentUploadForm: string;
  openSetupPage: string;
  openAmplify: string;
  openCmsEditPage: string;
  openAwsConsole: string;
  setupTab: string;
  documentsTab: string;
  updatesTab: string;
  setupKicker: string;
  setupTitle: string;
  setupBody: string;
  setupDetailsTitle: string;
  setupDetailsSubtitle: string;
  copyValueLabel: string;
  copiedLabel: string;
  dailyWorkflowTitle: string;
  dailyWorkflowSubtitle: string;
  taskMapTitle: string;
  taskMapSubtitle: string;
  documentWorkflowTitle: string;
  documentWorkflowSubtitle: string;
  documentSectionsTitle: string;
  documentSectionsSubtitle: string;
  documentChecksTitle: string;
  documentChecksSubtitle: string;
  contactUpdatesTitle: string;
  contactUpdatesSubtitle: string;
  downloadCsvLabel: string;
  contactUpdatesLoading: string;
  contactUpdatesLoadError: string;
  noContactUpdates: string;
  connectionKicker: string;
  connectionTitle: string;
  connectionBody: string;
  testConnection: string;
  testingConnection: string;
  connectionSuccess: string;
  connectionFailed: string;
  connectionFailureGuidance: string;
  connectionReady: string;
  connectionNotRun: string;
  lastCheckedLabel: string;
  latencyLabel: string;
  recordCountLabel: string;
  sampleTownLabel: string;
  endpointLabel: string;
  regionLabel: string;
  apiKeyLabel: string;
  apiKeyPresent: string;
  apiKeyMissing: string;
  troubleLabel: string;
  troubleText: string;
  quickReferenceKicker: string;
  quickReferenceTitle: string;
  quickReferenceBody: string;
  quickReferenceSteps: string[];
  statusAriaLabel: string;
  accessKicker: string;
  accessTitle: string;
  accessBody: string;
  accessChecklist: string[];
  loadingStatus: string;
  heroKicker: string;
  heroSummary: string;
  bannerKicker: string;
  bannerEnabled: string;
  bannerHidden: string;
  bannerSummary: string;
  noticesKicker: string;
  noticesSummary: string;
  noticesCountSuffix: string;
  eventsKicker: string;
  eventsSummary: string;
  eventsCountSuffix: string;
  contactsKicker: string;
  contactsSummary: string;
  contactsCountSuffix: string;
  aliasKicker: string;
  aliasTitle: string;
  aliasBody: string;
  aliasChecklist: string[];
  publishingKicker: string;
  publishingTitle: string;
  publishingSteps: string[];
  modelMapKicker: string;
  modelMapTitle: string;
  modelMapItems: string[];
  crudKicker: string;
  crudTitle: string;
  crudBody: string;
  crudItems: {
    model: string;
    summary: string;
    whereItShows: string;
    commonFields: string;
    operations: string[];
    notes: string;
  }[];
  routeKicker: string;
  routeTitle: string;
  routeBody: string;
  snapshotKicker: string;
  snapshotChecklist: string[];
  verificationKicker: string;
  verificationTitle: string;
  runtimeConfigLabel: string;
  runtimeConfigPresent: string;
  runtimeConfigMissing: string;
  contentSourceLabel: string;
  contentSourceStudio: string;
  contentSourceFallback: string;
  contentSourceLoading: string;
  contentSourceError: string;
  modelCoverageLabel: string;
  modelCoverageItems: string[];
  studioDocsTitle: string;
  studioDocsBody: string;
  studioDocsLinkText: string;
  setupAwsAccountLabel: string;
  setupAwsAccountHint: string;
  setupAmplifyAppLabel: string;
  setupAmplifyAppHint: string;
  setupAwsConsoleHint: string;
  setupStudioUrlHint: string;
  setupDataManagerUrlHint: string;
  setupRegionHint: string;
  connectionEndpointHint: string;
  connectionRegionHint: string;
  connectionApiKeyHint: string;
  crudWhereLabel: string;
  crudFieldsLabel: string;
  crudOperationsLabel: string;
}

const CMS_ADMIN_COPY: Record<SiteLanguage, CmsAdminCopy> = {
  en: {
    kicker: 'Town Clerk CMS',
    title: 'One place to update the Town website',
    intro:
      'Use Amplify Studio Data Manager for daily website updates across the normal CMS models. Use the document publishing guide on this page when you need to add a public file and route it through the supported Studio PublicDocument workflow.',
    uploadFormKicker: 'Document Publishing',
    uploadFormTitle: 'Open the Studio document publishing guide',
    uploadFormBody:
      'Use these instructions to open the supported Studio PublicDocument flow, choose the correct website section, and keep document publishing inside the same managed CMS process as the rest of the site.',
    returnHome: 'Return to homepage',
    openPublicDocumentUploadForm: 'Open document publishing guide',
    openSetupPage: 'Open clerk instructions',
    openAmplify: 'Open Studio Home',
    openCmsEditPage: 'Open Amplify Studio Data Manager',
    openAwsConsole: 'Open AWS Console',
    setupTab: 'Setup & credentials',
    documentsTab: 'Document publishing',
    updatesTab: 'Contact updates',
    setupKicker: 'Admin hub',
    setupTitle: 'Town of Wiley Content Management - for Deb & authorized staff',
    setupBody:
      'This is the single bookmarkable page for the daily CMS workflow, first-time setup details, live connection proof, document publishing guidance, and resident contact updates.',
    setupDetailsTitle: 'Setup & credentials',
    setupDetailsSubtitle:
      'Use these values to confirm the correct AWS account, region, and Amplify app before live edits.',
    copyValueLabel: 'Copy',
    copiedLabel: 'Copied',
    dailyWorkflowTitle: 'Do this every time',
    dailyWorkflowSubtitle: 'Daily editing workflow inside Amplify Studio Data Manager.',
    taskMapTitle: 'If you want to change this',
    taskMapSubtitle: 'Match the resident-facing task to the CMS model.',
    documentWorkflowTitle: 'Supported document workflow',
    documentWorkflowSubtitle:
      'Use Studio-managed PublicDocument edits instead of the retired in-page uploader.',
    documentSectionsTitle: 'Website section map',
    documentSectionsSubtitle:
      'Use these exact section IDs when routing files to the public Documents experience.',
    documentChecksTitle: 'Before you publish a document',
    documentChecksSubtitle:
      'Keep file publishing in the same supported CMS process as the rest of the site.',
    contactUpdatesTitle: 'Resident Contact Updates',
    contactUpdatesSubtitle: 'All submissions from the bill-pay contact-update form.',
    downloadCsvLabel: 'Download CSV',
    contactUpdatesLoading: 'Loading contact updates...',
    contactUpdatesLoadError: 'Could not load contact updates. See the message below and contact IT if this persists.',
    noContactUpdates: 'No contact updates received yet.',
    connectionKicker: 'CMS Connection Status',
    connectionTitle: 'Prove Studio is connected',
    connectionBody:
      'Run a live read against the same AppSync CMS endpoint the public site uses. This does not edit content.',
    testConnection: 'Test CMS Connection',
    testingConnection: 'Testing connection...',
    connectionSuccess: 'Connected',
    connectionFailed: 'Connection failed',
    connectionFailureGuidance:
      'The CMS could not be reached. The public site continues to show the most recent saved snapshot, but new edits in Amplify Studio will not appear until this connection is restored. Confirm the Amplify environment variables and redeploy, then re-run this test.',
    connectionReady: 'Ready to test',
    connectionNotRun: 'Not tested yet',
    lastCheckedLabel: 'Last checked',
    latencyLabel: 'Latency',
    recordCountLabel: 'Sample records',
    sampleTownLabel: 'Sample town name',
    endpointLabel: 'Endpoint',
    regionLabel: 'Region',
    apiKeyLabel: 'API key',
    apiKeyPresent: 'Present',
    apiKeyMissing: 'Missing',
    troubleLabel: 'Troubleshooting',
    troubleText:
      'Check the Amplify environment variables for APPSYNC_CMS_ENDPOINT, APPSYNC_CMS_API_KEY, and APPSYNC_CMS_REGION, then redeploy so runtime-config.js is regenerated.',
    quickReferenceKicker: 'Quick reference',
    quickReferenceTitle: 'Copy of the clerk instructions',
    quickReferenceBody:
      'Use this short checklist when you only need a reminder. The direct CMS link opens Amplify Studio Data Manager for normal CMS models, and the document publishing guide above points staff into the supported Studio PublicDocument workflow.',
    quickReferenceSteps: [
      'Open Data Manager.',
      'Open the correct model for the change you want to make.',
      'Edit the record and save it.',
      'Refresh the public site and confirm the change.',
    ],
    statusAriaLabel: 'CMS status',
    accessKicker: 'Clerk Access',
    accessTitle: 'Start here every day',
    accessBody:
      'Open Data Manager when you need to change live website content. Use the document publishing guide on this page when you need to route a new public file through the supported Studio PublicDocument workflow. Open Studio Home when you need the hosted Amplify Studio shell first (same login as Data Manager).',
    accessChecklist: [
      'Use Data Manager for everyday edits.',
      'Use the document publishing guide for PublicDocument files.',
      'If access is denied, AWS account permissions must be fixed first.',
      'Use only one model at a time so changes stay clear and easy to verify.',
      'After every save, refresh the public website and confirm the change.',
    ],
    loadingStatus: 'Refreshing the current homepage snapshot from Amplify Studio.',
    heroKicker: 'Hero',
    heroSummary: 'Current homepage title loaded from the shared CMS.',
    bannerKicker: 'Banner',
    bannerEnabled: 'Banner is enabled in Amplify Studio',
    bannerHidden: 'Banner is hidden in Amplify Studio',
    bannerSummary: 'Controlled by the AlertBanner model in Amplify Studio.',
    noticesKicker: 'Notices',
    noticesSummary:
      'These come from the Announcement model. Use announcementKind `newsletter` for the long-form Town newsletter block on /news; the newest active newsletter record (with `attachmentKey` set to a `documents/newsletter/...` PDF) renders inline.',
    noticesCountSuffix: 'notice cards',
    eventsKicker: 'Events',
    eventsSummary: 'These drive the live homepage calendar when staff-published events exist.',
    eventsCountSuffix: 'published events',
    contactsKicker: 'Contacts',
    contactsSummary: 'These come from the OfficialContact model.',
    contactsCountSuffix: 'public contacts',
    aliasKicker: 'Town Email Aliases',
    aliasTitle: 'Use EmailAlias only for Town email forwarding',
    aliasBody:
      'EmailAlias is not a public website card. Use it only when a Town email address should forward to a staff inbox behind the scenes.',
    aliasChecklist: [
      'Set aliasAddress to the public Town email address.',
      'Set destinationAddress to the private inbox that should receive the mail.',
      'Keep public contact cards in OfficialContact.',
      'Send a real test email after saving.',
    ],
    publishingKicker: 'Publishing Flow',
    publishingTitle: 'Daily website update checklist',
    publishingSteps: [
      'Open Data Manager for text and record changes, or use the document publishing guide on this page for PublicDocument files.',
      'Open the correct model for the change you want to make.',
      'Edit the record and save it.',
      'Refresh the public site and confirm the update.',
    ],
    modelMapKicker: 'Model Map',
    modelMapTitle: 'If you want to change this, open this model',
    modelMapItems: [
      'SiteSettings: homepage hero, welcome block, and town name text residents see first.',
      'AlertBanner: emergency strip at the top of the homepage when enabled.',
      'Announcement: short bulletin cards on the homepage; long newsletter column on /news when announcementKind is newsletter; attachmentKey can embed a PDF.',
      'Event: meetings and hearings that appear in the homepage calendar list.',
      'OfficialContact: staff/office phone and email cards on public contact pages.',
      'LeadershipRosterEntry: roster bullet lines under Mayor and Council and Town Administration on /contact (groupId mayor-council or town-administration).',
      'Business: directory listings on the business directory route.',
      'PublicDocument: downloadable files on /documents—use the document publishing guide and the exact sectionId.',
      'ExternalNewsLink: curated outbound headlines and URLs on /news.',
      'EmailAlias: invisible mail forwarding rules—never a public page field.',
    ],
    crudKicker: 'CRUD reference',
    crudTitle: 'Most CMS models get normal CRUD in Amplify Studio and AppSync',
    crudBody:
      'Amplify Studio Data Manager uses the AppSync-backed @model operations for the normal text-and-record models. PublicDocument records still exist in AppSync, and document publishing now routes staff into the supported Studio workflow instead of the retired custom uploader.',
    crudItems: [
      {
        model: 'SiteSettings',
        summary: 'Homepage title, hero text, and contact fields.',
        whereItShows: 'Homepage hero, welcome block, and overall town branding text.',
        commonFields:
          'townName, tagline, heroImageUrl, welcomeTitle, welcomeBody, and any contact lines shown next to the hero—keep a single active record.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes: 'Keep one current record for the public site.',
      },
      {
        model: 'AlertBanner',
        summary: 'Emergency banner content and call-to-action.',
        whereItShows: 'Top strip on the homepage when enabled.',
        commonFields:
          'enabled, label, title, detail, optional linkLabel and linkHref (URL) for a call-to-action link.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes: 'Keep one enabled banner at a time.',
      },
      {
        model: 'Announcement',
        summary: 'Public notices, closures, and long newsletter posts.',
        whereItShows:
          'Homepage “Current Wiley Updates” cards; long newsletter column on /news when announcementKind is newsletter.',
        commonFields:
          'title, detail, date, active, priority (lower sorts first), imageUrl, announcementKind (`newsletter` vs blank), attachmentKey (S3 key such as documents/newsletter/…pdf for inline PDF on /news).',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes:
          'Set announcementKind to `newsletter` for the /news newsletter section; leave blank for short bulletin notices. Use priority to control order. Paste the S3 storage key (e.g. `documents/newsletter/2026-05-newsletter.pdf`) into `attachmentKey` to render the PDF inline on /news. Only the latest active newsletter is shown.',
      },
      {
        model: 'Event',
        summary: 'Meetings, hearings, and calendar items.',
        whereItShows: 'Homepage meetings list and other event-driven areas that read this model.',
        commonFields:
          'title, start (required), end, description, location, active—events sort by start date/time for residents.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes:
          'Set title, start, and active for every record. Add description and location for the meetings cards, use end when it is known, and remember the site sorts events by start date and time.',
      },
      {
        model: 'OfficialContact',
        summary: 'Public contact cards for town staff and offices.',
        whereItShows: 'Contact and staff listings on the public site.',
        commonFields:
          'displayOrder, label (card heading), value (main line, e.g. phone or email text), detail (supporting text), href (mailto: or tel: URL), linkLabel (optional short link text).',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes: 'Use displayOrder to arrange the public list.',
      },
      {
        model: 'LeadershipRosterEntry',
        summary: 'Bullet lines for Mayor/Council and Town Administration rosters on /contact.',
        whereItShows:
          'Non-clickable leadership bullets on /contact when active rows exist for the matching groupId.',
        commonFields:
          'groupId (`mayor-council` or `town-administration`), displayOrder, lineEn, lineEs, active — one record per bullet.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes:
          'When any active rows exist for a groupId, the site replaces that entire bullet list from Studio. Fill both lineEn and lineEs for bilingual pages.',
      },
      {
        model: 'Business',
        summary: 'Business directory entries with phone, website, and image.',
        whereItShows: 'Town business directory pages and linked cards.',
        commonFields:
          'displayOrder, business name, category, phone, website URL, image/logo URL, short description fields as shown in Studio.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes: 'Use displayOrder to keep featured businesses first.',
      },
      {
        model: 'PublicDocument',
        summary: 'Public forms, notices, and downloadable documents.',
        whereItShows: '/documents and other resident download areas keyed by sectionId.',
        commonFields:
          'title, file or storage path, sectionId (must match the section map on this page), displayOrder within that section.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes:
          'Use the Studio publishing guide so file routing stays in the supported PublicDocument workflow.',
      },
      {
        model: 'ExternalNewsLink',
        summary: 'Outside news stories and regional updates.',
        whereItShows: '/news and other feeds that surface curated external links.',
        commonFields: 'displayOrder, headline/title, external URL, optional source label or summary fields.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes: 'Use displayOrder to control the order shown on the page.',
      },
      {
        model: 'EmailAlias',
        summary: 'Private forwarding rules for town email addresses.',
        whereItShows: 'Not shown on the website—only affects mail routing.',
        commonFields:
          'aliasAddress (public town address people write to) and destinationAddress (private inbox that receives the mail).',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes: 'Admin-only internal routing; no public ordering.',
      },
    ],
    routeKicker: 'Admin Route',
    routeTitle: 'Guidance and document upload access',
    routeBody:
      'This page is for guidance and CMS status only. Do not use it for routine website edits, but do use the document publishing guide above when you need to route a PublicDocument through Studio.',
    snapshotKicker: 'Current Snapshot',
    snapshotChecklist: [
      'Refresh this page after editing in Data Manager.',
      'If the public site does not change, check that the record saved correctly.',
      'Use the public homepage as the final resident-facing check.',
    ],
    verificationKicker: 'Verification',
    verificationTitle: 'Current CMS wiring on this deployment',
    runtimeConfigLabel: 'AppSync runtime config',
    runtimeConfigPresent: 'Present in runtime config',
    runtimeConfigMissing: 'Missing from runtime config',
    contentSourceLabel: 'Current content source',
    contentSourceStudio: 'Amplify Studio via AppSync',
    contentSourceFallback: 'Bundled fallback content',
    contentSourceLoading: 'Loading Amplify Studio content',
    contentSourceError: 'AppSync load failed and site fell back',
    modelCoverageLabel: 'Editable CMS models verified',
    modelCoverageItems: [
      'SiteSettings',
      'AlertBanner',
      'Announcement',
      'Event',
      'OfficialContact',
      'LeadershipRosterEntry',
      'Business',
      'PublicDocument',
      'ExternalNewsLink',
      'EmailAlias',
    ],
    studioDocsTitle: 'How Amplify Studio maps to this website',
    studioDocsBody:
      'AWS documents Studio as the visual place to manage your app backend: data modeling, authentication, storage, and the Data Manager (data browser) where you edit CMS records. The buttons above open hosted Studio; use Data / Content there to change live site text, files, and lists—then refresh townofwiley.gov to verify.',
    studioDocsLinkText: 'Read AWS Amplify Studio basics (Gen 1 documentation)',
    setupAwsAccountLabel: 'AWS account',
    setupAwsAccountHint:
      'The twelve-digit account that owns this Amplify app. Match it before editing so you are not in the wrong AWS organization.',
    setupAmplifyAppLabel: 'Amplify app',
    setupAmplifyAppHint:
      'The hosting app id for townofwiley.gov. It ties this website build to the correct Studio project and backend.',
    setupAwsConsoleHint:
      'Opens the full AWS console for advanced troubleshooting. Routine text and document edits should use Studio instead.',
    setupStudioUrlHint:
      'Hosted Amplify Studio login. After sign-in, use the Data or Content area to browse models (SiteSettings, Announcement, and so on) exactly as described on this page.',
    setupDataManagerUrlHint:
      'Same hosted Studio entry as Studio Home. In Studio, open Data Manager to list, create, edit, or delete CMS records that the public site reads through AppSync.',
    setupRegionHint:
      'AWS region where Amplify and AppSync run (us-east-2). Must match deployment and the CMS endpoint region.',
    connectionEndpointHint:
      'The AppSync GraphQL host the public website calls to load homepage content. If this is wrong or unreachable, the site falls back to bundled text.',
    connectionRegionHint: 'Region configured for the CMS AppSync API key and endpoint pair.',
    connectionApiKeyHint:
      'Public read key shipped in runtime config for anonymous homepage loads. It does not grant console login; it only proves the CMS read path works.',
    crudWhereLabel: 'Where residents see it',
    crudFieldsLabel: 'Fields to know in Studio',
    crudOperationsLabel: 'Operations in Data Manager',
  },
  es: {
    kicker: 'CMS de la secretaria',
    title: 'Un solo lugar para actualizar el sitio del pueblo',
    intro:
      'Use Amplify Studio Data Manager para los cambios diarios en los modelos normales del CMS. Use la guia de publicacion de documentos en esta pagina cuando necesite agregar un archivo publico y dirigirlo por el flujo compatible de PublicDocument en Studio.',
    uploadFormKicker: 'Publicacion de documentos',
    uploadFormTitle: 'Abrir la guia de publicacion de documentos en Studio',
    uploadFormBody:
      'Use estas instrucciones para abrir el flujo compatible de PublicDocument en Studio, elegir la seccion correcta del sitio y mantener la publicacion de documentos dentro del mismo proceso administrado del CMS.',
    returnHome: 'Volver a la pagina principal',
    openPublicDocumentUploadForm: 'Abrir guia de publicacion de documentos',
    openSetupPage: 'Abrir instrucciones del personal',
    openAmplify: 'Abrir Studio Home',
    openCmsEditPage: 'Abrir Amplify Studio Data Manager',
    openAwsConsole: 'Abrir consola de AWS',
    setupTab: 'Configuracion y datos',
    documentsTab: 'Publicacion de documentos',
    updatesTab: 'Actualizaciones de contacto',
    setupKicker: 'Centro administrativo',
    setupTitle: 'Administracion de contenido del Pueblo de Wiley - para Deb y personal autorizado',
    setupBody:
      'Esta es la pagina unica para guardar en favoritos: flujo diario del CMS, datos de configuracion, prueba de conexion en vivo, guia de documentos y actualizaciones de contacto de residentes.',
    setupDetailsTitle: 'Configuracion y credenciales',
    setupDetailsSubtitle:
      'Use estos valores para confirmar la cuenta de AWS, la region y la aplicacion Amplify correctas antes de editar contenido en vivo.',
    copyValueLabel: 'Copiar',
    copiedLabel: 'Copiado',
    dailyWorkflowTitle: 'Haga esto cada vez',
    dailyWorkflowSubtitle: 'Flujo diario de edicion dentro de Amplify Studio Data Manager.',
    taskMapTitle: 'Si quiere cambiar esto',
    taskMapSubtitle: 'Relacione la tarea para residentes con el modelo del CMS.',
    documentWorkflowTitle: 'Flujo compatible de documentos',
    documentWorkflowSubtitle:
      'Use ediciones PublicDocument administradas por Studio en lugar del cargador en pagina retirado.',
    documentSectionsTitle: 'Mapa de secciones del sitio',
    documentSectionsSubtitle:
      'Use estos sectionId exactos para dirigir archivos a la experiencia publica de documentos.',
    documentChecksTitle: 'Antes de publicar un documento',
    documentChecksSubtitle:
      'Mantenga la publicacion de archivos en el mismo proceso compatible del CMS que el resto del sitio.',
    contactUpdatesTitle: 'Actualizaciones de contacto de residentes',
    contactUpdatesSubtitle: 'Todos los envios del formulario de actualizacion de contacto de pago.',
    downloadCsvLabel: 'Descargar CSV',
    contactUpdatesLoading: 'Cargando actualizaciones de contacto...',
    contactUpdatesLoadError:
      'No se pudieron cargar las actualizaciones de contacto. Revise el mensaje a continuacion y contacte a TI si persiste.',
    noContactUpdates: 'Aun no se han recibido actualizaciones de contacto.',
    connectionKicker: 'Estado de conexion del CMS',
    connectionTitle: 'Comprobar que Studio esta conectado',
    connectionBody:
      'Ejecute una lectura en vivo contra el mismo endpoint AppSync del CMS que usa el sitio publico. Esto no edita contenido.',
    testConnection: 'Probar conexion del CMS',
    testingConnection: 'Probando conexion...',
    connectionSuccess: 'Conectado',
    connectionFailed: 'Fallo la conexion',
    connectionFailureGuidance:
      'No se pudo contactar el CMS. El sitio publico sigue mostrando la captura mas reciente, pero las nuevas ediciones en Amplify Studio no apareceran hasta que se restablezca la conexion. Revise las variables de entorno de Amplify, vuelva a desplegar y pruebe de nuevo.',
    connectionReady: 'Listo para probar',
    connectionNotRun: 'Aun no probado',
    lastCheckedLabel: 'Ultima revision',
    latencyLabel: 'Latencia',
    recordCountLabel: 'Registros de muestra',
    sampleTownLabel: 'Nombre de pueblo de muestra',
    endpointLabel: 'Endpoint',
    regionLabel: 'Region',
    apiKeyLabel: 'Clave API',
    apiKeyPresent: 'Presente',
    apiKeyMissing: 'Falta',
    troubleLabel: 'Solucion de problemas',
    troubleText:
      'Revise las variables de entorno de Amplify APPSYNC_CMS_ENDPOINT, APPSYNC_CMS_API_KEY y APPSYNC_CMS_REGION, luego vuelva a desplegar para regenerar runtime-config.js.',
    quickReferenceKicker: 'Referencia rapida',
    quickReferenceTitle: 'Copia de las instrucciones de la secretaria',
    quickReferenceBody:
      'Use esta lista corta cuando solo necesite un recordatorio. El enlace directo del CMS abre Amplify Studio Data Manager para los modelos normales del CMS, y la guia de publicacion de documentos dirige al personal al flujo compatible de PublicDocument en Studio.',
    quickReferenceSteps: [
      'Abra Data Manager.',
      'Abra el modelo correcto para el cambio que desea hacer.',
      'Edite el registro y guardelo.',
      'Actualice el sitio publico y confirme el cambio.',
    ],
    statusAriaLabel: 'Estado del CMS',
    accessKicker: 'Acceso del personal',
    accessTitle: 'Empiece aqui cada dia',
    accessBody:
      'Abra Data Manager cuando necesite cambiar contenido en vivo. Abra la guia de publicacion de documentos cuando necesite dirigir un archivo publico por el flujo compatible de PublicDocument en Studio. Abra Studio Home cuando necesite primero el entorno alojado de Amplify Studio (mismo inicio de sesion que Data Manager).',
    accessChecklist: [
      'Use Data Manager para las ediciones diarias.',
      'Use la guia de publicacion de documentos para los archivos PublicDocument.',
      'Si aparece acceso denegado, primero deben corregirse los permisos de AWS.',
      'Use un solo modelo a la vez para mantener cambios claros y faciles de revisar.',
      'Despues de cada guardado, actualice el sitio publico y confirme el cambio.',
    ],
    loadingStatus: 'Actualizando la captura actual de la pagina principal desde Amplify Studio.',
    heroKicker: 'Hero',
    heroSummary: 'Titulo actual de la pagina principal cargado desde el CMS compartido.',
    bannerKicker: 'Banner',
    bannerEnabled: 'El banner esta habilitado en Amplify Studio',
    bannerHidden: 'El banner esta oculto en Amplify Studio',
    bannerSummary: 'Controlado por el modelo AlertBanner en Amplify Studio.',
    noticesKicker: 'Avisos',
    noticesSummary:
      'Estos provienen del modelo Announcement. Use announcementKind `newsletter` para el bloque largo del boletin en /news; el registro mas reciente con `attachmentKey` apuntando a un PDF en `documents/newsletter/...` se mostrara en linea.',
    noticesCountSuffix: 'tarjetas de avisos',
    eventsKicker: 'Eventos',
    eventsSummary:
      'Estos alimentan el calendario en vivo de la pagina principal cuando el personal publica eventos.',
    eventsCountSuffix: 'eventos publicados',
    contactsKicker: 'Contactos',
    contactsSummary: 'Estos provienen del modelo OfficialContact.',
    contactsCountSuffix: 'contactos publicos',
    aliasKicker: 'Alias de correo del pueblo',
    aliasTitle: 'Use EmailAlias solo para reenvio de correo del pueblo',
    aliasBody:
      'EmailAlias no es una tarjeta publica del sitio. Use este modelo solo cuando un correo del pueblo deba reenviarse a una bandeja privada del personal.',
    aliasChecklist: [
      'Configure aliasAddress con el correo publico del pueblo.',
      'Configure destinationAddress con la bandeja privada que debe recibir el mensaje.',
      'Mantenga las tarjetas publicas en OfficialContact.',
      'Envie un correo real de prueba despues de guardar.',
    ],
    publishingKicker: 'Flujo de publicacion',
    publishingTitle: 'Lista diaria para actualizar el sitio',
    publishingSteps: [
      'Abra Data Manager para cambios de texto y registros, o abra la guia de publicacion de documentos para archivos PublicDocument.',
      'Abra el modelo correcto para el cambio que desea hacer.',
      'Edite el registro y guardelo.',
      'Actualice el sitio publico y confirme el cambio.',
    ],
    modelMapKicker: 'Mapa de modelos',
    modelMapTitle: 'Si quiere cambiar esto, abra este modelo',
    modelMapItems: [
      'SiteSettings: hero de portada, bloque de bienvenida y nombre del pueblo que ven primero.',
      'AlertBanner: franja de emergencia arriba de la portada cuando esta habilitado.',
      'Announcement: tarjetas breves en portada; columna larga del boletin en /news si announcementKind es newsletter; attachmentKey puede incrustar un PDF.',
      'Event: reuniones y audiencias en el calendario de la portada.',
      'OfficialContact: tarjetas de telefono y correo del personal en paginas de contacto.',
      'LeadershipRosterEntry: lineas de viñetas del alcalde/concejo y administracion del pueblo en /contact (groupId mayor-council o town-administration).',
      'Business: entradas del directorio de negocios en su ruta publica.',
      'PublicDocument: archivos descargables en /documents: use la guia de publicacion y el sectionId exacto.',
      'ExternalNewsLink: titulos y enlaces externos curados en /news.',
      'EmailAlias: reenvio de correo invisible; nunca es un campo de pagina publica.',
    ],
    crudKicker: 'Referencia CRUD',
    crudTitle: 'La mayoria de los modelos del CMS tienen CRUD normal en Amplify Studio y AppSync',
    crudBody:
      'Amplify Studio Data Manager usa las operaciones @model soportadas por AppSync para los modelos normales de texto y registros. Los registros PublicDocument siguen existiendo en AppSync, y la publicacion de documentos ahora dirige al personal al flujo compatible de Studio en lugar del cargador personalizado retirado.',
    crudItems: [
      {
        model: 'SiteSettings',
        summary: 'Titulo de la pagina principal, texto del hero y campos de contacto.',
        whereItShows: 'Hero de la portada, bloque de bienvenida y texto general de la marca del pueblo.',
        commonFields:
          'townName, tagline, heroImageUrl, welcomeTitle, welcomeBody y lineas de contacto junto al hero: conserve un solo registro activo.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes: 'Conserve un solo registro actual para el sitio publico.',
      },
      {
        model: 'AlertBanner',
        summary: 'Contenido del banner de emergencia y llamada a la accion.',
        whereItShows: 'Franja superior de la portada cuando esta habilitado.',
        commonFields:
          'enabled, label, title, detail, linkLabel y linkHref opcionales (URL del enlace).',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes: 'Conserve un solo banner habilitado a la vez.',
      },
      {
        model: 'Announcement',
        summary: 'Avisos publicos, cierres y publicaciones largas del boletin.',
        whereItShows:
          'Tarjetas “Actualizaciones de Wiley” en la portada; columna larga del boletin en /news si announcementKind es newsletter.',
        commonFields:
          'title, detail, date, active, priority (menor ordena primero), imageUrl, announcementKind (`newsletter` o vacio), attachmentKey (clave S3 como documents/newsletter/…pdf para PDF en linea en /news).',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes:
          'Configure announcementKind en `newsletter` para la seccion de boletin en /news; dejelo en blanco para avisos breves. Use priority para el orden. Pegue la clave de almacenamiento S3 (por ejemplo `documents/newsletter/2026-05-newsletter.pdf`) en `attachmentKey` para mostrar el PDF en linea en /news. Solo se muestra el boletin activo mas reciente.',
      },
      {
        model: 'Event',
        summary: 'Reuniones, audiencias y elementos del calendario.',
        whereItShows: 'Lista de reuniones en la portada y otras areas que lean este modelo.',
        commonFields:
          'title, start (obligatorio), end, description, location, active: el sitio ordena por fecha y hora de inicio.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes:
          'Configure title, start y active en cada registro. Agregue description y location para las tarjetas de reuniones, use end cuando se conozca y recuerde que el sitio ordena los eventos por fecha y hora de inicio.',
      },
      {
        model: 'OfficialContact',
        summary: 'Tarjetas de contacto publico para personal y oficinas.',
        whereItShows: 'Listados de contacto y personal en el sitio publico.',
        commonFields:
          'displayOrder, label (titulo de la tarjeta), value (linea principal, p. ej. telefono o correo), detail (texto de apoyo), href (URL mailto: o tel:), linkLabel (texto corto del enlace).',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes: 'Use displayOrder para ordenar la lista publica.',
      },
      {
        model: 'LeadershipRosterEntry',
        summary: 'Lineas de viñetas del alcalde/concejo y administracion del pueblo en /contact.',
        whereItShows:
          'Viñetas de liderazgo no enlazables en /contact cuando hay registros activos con el groupId correspondiente.',
        commonFields:
          'groupId (`mayor-council` o `town-administration`), displayOrder, lineEn, lineEs, active: un registro por viñeta.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes:
          'Si existe cualquier fila activa para un groupId, el sitio reemplaza toda esa lista desde Studio. Complete lineEn y lineEs para paginas bilingues.',
      },
      {
        model: 'Business',
        summary: 'Entradas del directorio de negocios con telefono, sitio web e imagen.',
        whereItShows: 'Paginas del directorio de negocios del pueblo.',
        commonFields:
          'displayOrder, nombre del negocio, categoria, telefono, URL del sitio, URL de imagen o logo, descripcion corta segun Studio.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes: 'Use displayOrder para mantener primero los negocios destacados.',
      },
      {
        model: 'PublicDocument',
        summary: 'Formularios publicos, avisos y documentos descargables.',
        whereItShows: '/documents y otras zonas de descarga segun sectionId.',
        commonFields:
          'title, ruta de archivo o almacenamiento, sectionId (debe coincidir con el mapa de esta pagina), displayOrder dentro de esa seccion.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes:
          'Use la guia de publicacion en Studio para que la ruta del archivo permanezca en el flujo compatible de PublicDocument.',
      },
      {
        model: 'ExternalNewsLink',
        summary: 'Noticias externas y actualizaciones regionales.',
        whereItShows: '/news y otras listas que muestren enlaces externos curados.',
        commonFields: 'displayOrder, titulo, URL externa, etiqueta de fuente o resumen opcional.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes: 'Use displayOrder para controlar el orden mostrado.',
      },
      {
        model: 'EmailAlias',
        summary: 'Reglas privadas de reenvio para direcciones de correo del pueblo.',
        whereItShows: 'No aparece en el sitio web: solo afecta el enrutamiento del correo.',
        commonFields:
          'aliasAddress (correo publico del pueblo) y destinationAddress (bandeja privada que recibe).',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes: 'Solo uso interno del personal; sin orden publico.',
      },
    ],
    routeKicker: 'Ruta administrativa de solo lectura',
    routeTitle: 'No edite el sitio en esta pagina',
    routeBody:
      'Esta pagina solo muestra guia y estado actual del CMS. No guarda ni publica contenido del sitio.',
    snapshotKicker: 'Captura actual',
    snapshotChecklist: [
      'Actualice esta pagina despues de editar en Data Manager.',
      'Si el sitio publico no cambia, revise que el registro se haya guardado bien.',
      'Use la pagina principal publica como revision final para residentes.',
    ],
    verificationKicker: 'Verificacion',
    verificationTitle: 'Conexion actual del CMS en este despliegue',
    runtimeConfigLabel: 'Configuracion de tiempo de ejecucion de AppSync',
    runtimeConfigPresent: 'Presente en la configuracion de tiempo de ejecucion',
    runtimeConfigMissing: 'Falta en la configuracion de tiempo de ejecucion',
    contentSourceLabel: 'Fuente actual del contenido',
    contentSourceStudio: 'Amplify Studio por AppSync',
    contentSourceFallback: 'Contenido incluido en la aplicacion',
    contentSourceLoading: 'Cargando contenido de Amplify Studio',
    contentSourceError: 'Fallo la carga de AppSync y el sitio uso el contenido incluido',
    modelCoverageLabel: 'Modelos editables del CMS verificados',
    modelCoverageItems: [
      'SiteSettings',
      'AlertBanner',
      'Announcement',
      'Event',
      'OfficialContact',
      'LeadershipRosterEntry',
      'Business',
      'PublicDocument',
      'ExternalNewsLink',
      'EmailAlias',
    ],
    studioDocsTitle: 'Como Amplify Studio se relaciona con este sitio',
    studioDocsBody:
      'AWS describe Studio como el entorno visual para administrar el backend: modelado de datos, autenticacion, almacenamiento y el Administrador de datos (navegador de datos) donde edita los registros del CMS. Los botones superiores abren Studio alojado; use Datos o Contenido alli para cambiar textos, archivos y listas en vivo, luego actualice townofwiley.gov para comprobar.',
    studioDocsLinkText: 'Lea los conceptos basicos de AWS Amplify Studio (documentacion Gen 1)',
    setupAwsAccountLabel: 'Cuenta de AWS',
    setupAwsAccountHint:
      'Los doce digitos de la cuenta propietaria de esta app Amplify. Verifiquelos antes de editar para no estar en otra organizacion.',
    setupAmplifyAppLabel: 'Aplicacion Amplify',
    setupAmplifyAppHint:
      'Id de hospedaje de townofwiley.gov. Une este sitio al proyecto Studio y backend correctos.',
    setupAwsConsoleHint:
      'Abre la consola AWS completa para soporte avanzado. Las ediciones rutinarias deben hacerse en Studio.',
    setupStudioUrlHint:
      'Inicio de sesion en Amplify Studio alojado. Despues de entrar, use Datos o Contenido para ver modelos (SiteSettings, Announcement, etc.) como en esta pagina.',
    setupDataManagerUrlHint:
      'Misma entrada que Studio Home. En Studio, abra Data Manager para listar, crear, editar o eliminar registros CMS que el sitio lee por AppSync.',
    setupRegionHint:
      'Region AWS donde corren Amplify y AppSync (us-east-2). Debe coincidir con el despliegue y la region del endpoint CMS.',
    connectionEndpointHint:
      'Host GraphQL de AppSync que el sitio publico usa para la pagina principal. Si falla, el sitio usa texto incluido en la app.',
    connectionRegionHint: 'Region configurada para la clave y el par de endpoint CMS de AppSync.',
    connectionApiKeyHint:
      'Clave de lectura publica en la configuracion de tiempo de ejecucion para cargas anonimas de la portada. No inicia sesion en la consola; solo prueba la lectura CMS.',
    crudWhereLabel: 'Donde lo ven los residentes',
    crudFieldsLabel: 'Campos clave en Studio',
    crudOperationsLabel: 'Operaciones en Data Manager',
  },
};

@Component({
  selector: 'app-cms-admin',
  templateUrl: './cms-admin.html',
  styleUrl: './cms-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  /**
   * Outbound Amplify Studio anchors use full HTTPS URLs (hosted admin at
   * `{region}.admin.amplifyapp.com`). With `provideClientHydration(withEventReplay())`,
   * delegated click replay on the SSR shell could prevent normal browser navigation—
   * clerk-visible buttons appeared "dead". Opt this route out so native
   * `<a href target="_blank">` works reliably (see NG8108 / hydration docs:
   * https://angular.dev/extended-diagnostics/NG8108).
   */
  host: {
    ngSkipHydration: '',
  },
  imports: [
    DatePipe,
    TabsModule,
    TableModule,
    ButtonModule,
    CardModule,
    TagModule,
    SkeletonModule,
    MessageModule,
    TooltipModule,
  ],
})
export class CmsAdmin {
  /** Official AWS Amplify Gen 1 Studio documentation (linked from the admin hub). */
  protected readonly amplifyStudioGen1DocsUrl = AMPLIFY_STUDIO_GEN1_DOCS_URL;

  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly contactUpdateReview = inject(ContactUpdateReviewService);
  private readonly clerkSetupConfig = getClerkSetupRuntimeConfig();
  private readonly appSyncRuntimeConfig = (() => {
    if (typeof window === 'undefined') {
      return { region: '', apiEndpoint: '', apiKey: '' };
    }

    const runtimeWindow = window as Window & {
      __TOW_RUNTIME_CONFIG__?: CmsAdminRuntimeConfig;
      __TOW_RUNTIME_CONFIG_OVERRIDE__?: CmsAdminRuntimeConfig;
    };
    const appSync = {
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG__?.cms?.appSync ?? {}),
      ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.cms?.appSync ?? {}),
    };

    return {
      region: typeof appSync?.region === 'string' ? appSync.region : '',
      apiEndpoint: typeof appSync?.apiEndpoint === 'string' ? appSync.apiEndpoint : '',
      apiKey: typeof appSync?.apiKey === 'string' ? appSync.apiKey : '',
    };
  })();

  protected readonly activeTab = signal<string>(this.resolveInitialTab());
  protected readonly contactUpdatesLoading = signal(true);
  protected readonly contactUpdatesLoadError = signal<string | null>(null);
  protected readonly contactUpdates = signal<ContactUpdateRecord[]>([]);
  protected readonly connectionTestResult = signal<CmsConnectionTestResult | null>(null);
  protected readonly connectionTestLoading = signal(false);
  protected readonly copiedSetupKey = signal<string | null>(null);
  protected readonly setupCardPt = {
    body: { class: 'setup-card-body' },
    title: { class: 'setup-card-title' },
    subtitle: { class: 'setup-card-subtitle' },
    footer: { class: 'setup-card-footer' },
  };

  protected readonly persistenceSummary = this.cmsStore.persistenceSummary;
  protected readonly isLoading = this.cmsStore.isLoading;
  protected readonly loadError = this.cmsStore.loadError;
  protected readonly copy = computed(
    () => CMS_ADMIN_COPY[this.siteLanguageService.currentLanguage()],
  );
  protected readonly heroTitle = computed(() => this.cmsStore.hero().title);
  protected readonly heroMessage = computed(() => this.cmsStore.hero().message);
  protected readonly noticeCount = computed(() => this.cmsStore.notices().length);
  protected readonly eventCount = computed(() => this.cmsStore.events().length);
  protected readonly contactCount = computed(() => this.cmsStore.contacts().length);
  protected readonly hasAppSyncRuntimeConfig =
    Boolean(this.appSyncRuntimeConfig.apiEndpoint) && Boolean(this.appSyncRuntimeConfig.apiKey);
  protected readonly maskedEndpoint = computed(() =>
    this.maskEndpoint(this.appSyncRuntimeConfig.apiEndpoint),
  );
  protected readonly appSyncRegion = computed(
    () => this.appSyncRuntimeConfig.region || this.clerkSetupConfig.awsRegion || 'not configured',
  );
  protected readonly awsAccountId = this.clerkSetupConfig.awsAccountId;
  protected readonly amplifyAppId = this.clerkSetupConfig.amplifyAppId;
  protected readonly awsRegion = this.clerkSetupConfig.awsRegion;
  protected readonly awsConsoleUrl = this.clerkSetupConfig.awsConsoleUrl;
  protected readonly studioUrl = this.clerkSetupConfig.studioUrl;
  protected readonly dataManagerUrl = this.buildDataManagerUrl();
  protected readonly setupDetails = computed<CmsAdminSetupDetail[]>(() => {
    const copy = this.copy();
    return [
      {
        key: 'aws-account',
        label: copy.setupAwsAccountLabel,
        labelHint: copy.setupAwsAccountHint,
        value: this.awsAccountId || 'Not configured',
        copyValue: this.awsAccountId,
      },
      {
        key: 'region',
        label: copy.regionLabel,
        labelHint: copy.setupRegionHint,
        value: this.awsRegion || 'Not configured',
        copyValue: this.awsRegion,
      },
      {
        key: 'amplify-app',
        label: copy.setupAmplifyAppLabel,
        labelHint: copy.setupAmplifyAppHint,
        value: this.amplifyAppId || 'Not configured',
        copyValue: this.amplifyAppId,
      },
      {
        key: 'aws-console',
        label: copy.openAwsConsole,
        labelHint: copy.setupAwsConsoleHint,
        value: this.awsConsoleUrl,
        copyValue: this.awsConsoleUrl,
      },
      {
        key: 'studio-url',
        label: copy.openAmplify,
        labelHint: copy.setupStudioUrlHint,
        value: this.studioUrl,
        copyValue: this.studioUrl,
      },
      {
        key: 'data-manager-url',
        label: copy.openCmsEditPage,
        labelHint: copy.setupDataManagerUrlHint,
        value: this.dataManagerUrl,
        copyValue: this.dataManagerUrl,
      },
    ];
  });
  protected readonly dailyChecklist = computed(() =>
    this.siteLanguageService.currentLanguage() === 'es'
      ? [
          'Use el usuario correcto para la cuenta del pueblo.',
          'Abra Amplify Studio Data Manager para cambios de texto y registros.',
          'Use la pestana de documentos para seguir el flujo PublicDocument compatible.',
          'Abra el modelo correcto.',
          'Haga el cambio y guarde el registro.',
          'Actualice el sitio publico y confirme el cambio.',
        ]
      : [
          'Use the correct IAM user for the Town account.',
          'Open Amplify Studio Data Manager for text and record changes.',
          'Use the Document Publishing tab to follow the supported Studio PublicDocument workflow.',
          'Open the correct model.',
          'Make the change and save the record.',
          'Refresh the public website and confirm the update.',
        ],
  );
  protected readonly taskMap = computed<CmsAdminTask[]>(() =>
    this.siteLanguageService.currentLanguage() === 'es'
      ? [
          {
            action: 'Titulo de inicio, texto de bienvenida y foto principal',
            model: 'SiteSettings',
            hint: 'En Studio > Data Manager: modelo SiteSettings, normalmente un solo registro para hero y textos de portada.',
          },
          {
            action: 'Banner de emergencia en la pagina principal',
            model: 'AlertBanner',
            hint: 'En Studio: modelo AlertBanner; enabled enciende la franja; label, title y detail son el texto visible; linkHref es la URL del boton.',
          },
          {
            action: 'Avisos publicos, cierres y anuncios generales',
            model: 'Announcement',
            hint: 'En Studio: modelo Announcement; active y priority controlan tarjetas en portada; announcementKind y attachmentKey enlazan con /news y PDFs.',
          },
          {
            action: 'Reuniones, audiencias y calendario',
            model: 'Event',
            hint: 'En Studio: modelo Event; start/end alimentan el calendario; description y location aparecen en tarjetas de reuniones.',
          },
          {
            action: 'Tarjetas de contacto del personal',
            model: 'OfficialContact',
            hint: 'En Studio: modelo OfficialContact; conserve ids `town-information` y `city-clerk` para pie de pagina y permisos; displayOrder ordena tarjetas.',
          },
          {
            action: 'Listas de viñetas del alcalde/concejo y administracion en /contact',
            model: 'LeadershipRosterEntry',
            hint: 'En Studio: modelo LeadershipRosterEntry; groupId `mayor-council` o `town-administration`; una fila por viñeta con lineEn y lineEs; displayOrder ordena lineas.',
          },
          {
            action: 'Directorio de negocios, logos y sitios web',
            model: 'Business',
            hint: 'En Studio: modelo Business; displayOrder y campos de negocio alimentan el directorio publico.',
          },
          {
            action: 'Documentos publicos, formularios y descargas',
            model: 'PublicDocument',
            hint: 'En Studio: modelo PublicDocument; sectionId debe coincidir con las secciones de la pestana Document publishing.',
          },
          {
            action: 'Noticias externas compartidas en el sitio',
            model: 'ExternalNewsLink',
            hint: 'En Studio: modelo ExternalNewsLink; enlaces externos curados para /news u otras listas.',
          },
          {
            action: 'Reglas internas de reenvio de correo',
            model: 'EmailAlias',
            hint: 'En Studio: modelo EmailAlias; solo enrutamiento de correo, no aparece en paginas publicas.',
          },
        ]
      : [
          {
            action: 'Homepage title, welcome text, and hero photo',
            model: 'SiteSettings',
            hint: 'In Studio Data Manager: open the SiteSettings model—usually one record controls the homepage hero and welcome text.',
          },
          {
            action: 'Emergency banner shown at the top of the homepage',
            model: 'AlertBanner',
            hint: 'In Studio: open AlertBanner; enabled toggles the strip; label, title, and detail are the resident-facing text; linkHref is the optional button URL.',
          },
          {
            action: 'Public notices, closures, and general announcements',
            model: 'Announcement',
            hint: 'In Studio: open Announcement; active and priority control homepage cards; announcementKind and attachmentKey tie to /news and inline PDFs.',
          },
          {
            action: 'Meetings, hearings, and calendar events',
            model: 'Event',
            hint: 'In Studio: open Event; start/end drive the live calendar; description and location populate meeting cards.',
          },
          {
            action: 'Staff contact cards for names, phones, and emails',
            model: 'OfficialContact',
            hint: 'In Studio: open OfficialContact; keep record ids `town-information` and `city-clerk` for shell and permits; displayOrder sorts cards.',
          },
          {
            action: 'Mayor/Council and Town Administration bullet lists on /contact',
            model: 'LeadershipRosterEntry',
            hint: 'In Studio: open LeadershipRosterEntry; groupId `mayor-council` or `town-administration`; one row per bullet with lineEn and lineEs; displayOrder sorts lines.',
          },
          {
            action: 'Business directory entries, logos, and websites',
            model: 'Business',
            hint: 'In Studio: open Business; displayOrder plus business fields feed the public directory.',
          },
          {
            action: 'Public documents, forms, and downloads',
            model: 'PublicDocument',
            hint: 'In Studio: open PublicDocument; sectionId must match the Document publishing tab section map.',
          },
          {
            action: 'Outside news links shared on the site',
            model: 'ExternalNewsLink',
            hint: 'In Studio: open ExternalNewsLink; curated outbound links for /news or similar lists.',
          },
          {
            action: 'Town email forwarding rules for behind-the-scenes delivery',
            model: 'EmailAlias',
            hint: 'In Studio: open EmailAlias; mail routing only—nothing is rendered on public pages.',
          },
        ],
  );
  protected readonly documentPublishingSteps = computed(() =>
    this.siteLanguageService.currentLanguage() === 'es'
      ? [
          'Abra Data Manager y continue al flujo compatible de PublicDocument en Studio.',
          'Cree o actualice el registro PublicDocument en Studio.',
          'Dirija el archivo a la seccion publica correcta usando el sectionId exacto.',
          'Guarde el cambio y actualice la pagina publica de documentos para verificarlo.',
        ]
      : [
          'Open Data Manager and continue into the supported Studio PublicDocument workflow.',
          'Create or update the PublicDocument entry there instead of using the retired in-page uploader.',
          'Route the file to the correct resident-facing section using the exact sectionId shown below.',
          'Save the Studio change, then refresh the public Documents page or related resident page to verify it appears.',
        ],
  );
  protected readonly documentSections = computed<CmsAdminDocumentSection[]>(() =>
    this.siteLanguageService.currentLanguage() === 'es'
      ? [
          {
            label: 'Documentos de reuniones',
            sectionId: 'meeting-documents',
            detail: 'Agendas, actas aprobadas y registros recurrentes de reuniones.',
          },
          {
            label: 'Documentos financieros',
            sectionId: 'financial-documents',
            detail: 'Presupuestos, informes anuales, auditorias y descargas financieras.',
          },
          {
            label: 'Codigo y zonificacion',
            sectionId: 'code-references',
            detail: 'Ordenanzas, zonificacion, permisos y referencias de codigo.',
          },
          {
            label: 'Registros y solicitudes',
            sectionId: 'records-requests',
            detail:
              'Formularios de registros, seguimiento de secretaria y guia de registros publicos.',
          },
          {
            label: 'Boletin del pueblo',
            sectionId: 'newsletter',
            detail:
              'PDFs mensuales del boletin del pueblo. Suba el archivo a `documents/newsletter/<archivo>.pdf` y pegue esa clave en el campo attachmentKey del registro Announcement (con announcementKind=`newsletter`).',
          },
        ]
      : [
          {
            label: 'Meeting Documents',
            sectionId: 'meeting-documents',
            detail: 'Agenda packets, approved minutes, and other recurring meeting records.',
          },
          {
            label: 'Financial Documents',
            sectionId: 'financial-documents',
            detail: 'Budget summaries, annual reports, audits, and finance downloads.',
          },
          {
            label: 'Code & Zoning References',
            sectionId: 'code-references',
            detail: 'Ordinances, zoning references, permit guidance, and code lookups.',
          },
          {
            label: 'Records & Requests',
            sectionId: 'records-requests',
            detail: 'Records request forms, clerk follow-up files, and public records guidance.',
          },
          {
            label: 'Town Newsletter',
            sectionId: 'newsletter',
            detail:
              'Monthly Town newsletter PDFs. Upload to `documents/newsletter/<file>.pdf` and paste that key into the Announcement record\u2019s attachmentKey (announcementKind=`newsletter`). The latest active record renders inline on /news.',
          },
        ],
  );
  protected readonly documentPublishingChecks = computed(() =>
    this.siteLanguageService.currentLanguage() === 'es'
      ? [
          'Si el flujo de Studio no abre o dice acceso denegado, corrija permisos de AWS primero.',
          'Mantenga los cambios PublicDocument en Studio para que metadata y registro sigan juntos.',
          'Use el modelo Event para reuniones y audiencias para alimentar el calendario en vivo.',
        ]
      : [
          'If the supported Studio flow is unavailable or says access is denied, fix AWS permissions first.',
          'Keep PublicDocument edits in Studio so the file metadata and database record stay in the same supported CMS process.',
          'Use the Events model for meetings and hearing dates so posted events keep driving the live calendar.',
        ],
  );
  protected readonly alertStatusLabel = computed(() =>
    this.cmsStore.alertBanner().enabled ? this.copy().bannerEnabled : this.copy().bannerHidden,
  );
  protected readonly contentSourceStatus = computed(() => {
    if (!this.hasAppSyncRuntimeConfig) {
      return this.copy().contentSourceFallback;
    }

    if (this.isLoading()) {
      return this.copy().contentSourceLoading;
    }

    if (this.loadError()) {
      return this.copy().contentSourceError;
    }

    return this.copy().contentSourceStudio;
  });
  protected readonly publicDocumentUploadFormUrl = '/admin#documents';
  protected readonly cmsEditUrl = this.dataManagerUrl;
  protected readonly clerkSetupUrl = '/admin#setup';

  constructor() {
    void this.loadContactUpdates();
  }

  protected updateActiveTab(value: string | number | undefined): void {
    const tab = value?.toString() ?? 'setup';
    this.activeTab.set(tab);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/admin#${tab}`);
    }
  }

  protected async testConnection(): Promise<void> {
    this.connectionTestLoading.set(true);

    try {
      this.connectionTestResult.set(await this.cmsStore.testCmsConnection());
    } finally {
      this.connectionTestLoading.set(false);
    }
  }

  protected async copySetupValue(detail: CmsAdminSetupDetail): Promise<void> {
    if (!detail.copyValue) {
      return;
    }

    try {
      await navigator.clipboard.writeText(detail.copyValue);
      this.copiedSetupKey.set(detail.key);
      window.setTimeout(() => this.copiedSetupKey.set(null), 1800);
    } catch {
      this.copiedSetupKey.set(null);
    }
  }

  protected downloadCSV(): void {
    this.contactUpdateReview.downloadAsCSV(this.contactUpdates());
  }

  private resolveInitialTab(): string {
    if (typeof window === 'undefined') {
      return 'setup';
    }

    const fragment = window.location.hash.replace(/^#/, '');

    if (fragment === 'documents' || fragment === 'updates' || fragment === 'setup') {
      return fragment;
    }

    return 'setup';
  }

  private async loadContactUpdates(): Promise<void> {
    this.contactUpdatesLoading.set(true);
    this.contactUpdatesLoadError.set(null);

    try {
      const result = await this.contactUpdateReview.getAllUpdates();
      if (result.ok) {
        this.contactUpdates.set(result.data);
      } else {
        this.contactUpdates.set([]);
        this.contactUpdatesLoadError.set(result.error);
      }
    } finally {
      this.contactUpdatesLoading.set(false);
    }
  }

  private buildDataManagerUrl(): string {
    const region = this.clerkSetupConfig.awsRegion;
    const appId = this.clerkSetupConfig.amplifyAppId;

    return buildAmplifyAdminStudioHomeUrl(region, appId, this.clerkSetupConfig.studioUrl);
  }

  private maskEndpoint(endpoint: string): string {
    if (!endpoint) {
      return 'Not configured';
    }

    try {
      return new URL(endpoint).host;
    } catch {
      return endpoint.replace(/^https?:\/\//, '').split('/')[0] || endpoint;
    }
  }
}
