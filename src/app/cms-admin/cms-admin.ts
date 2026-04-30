import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { getClerkSetupRuntimeConfig } from '../clerk-setup/clerk-setup-config';
import {
  ContactUpdateRecord,
  ContactUpdateReviewService,
} from '../clerk-setup/contact-update-review.service';
import { CmsConnectionTestResult, LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

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
  value: string;
  copyValue: string;
}

interface CmsAdminTask {
  action: string;
  model: string;
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
  noContactUpdates: string;
  connectionKicker: string;
  connectionTitle: string;
  connectionBody: string;
  testConnection: string;
  testingConnection: string;
  connectionSuccess: string;
  connectionFailed: string;
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
    noContactUpdates: 'No contact updates received yet.',
    connectionKicker: 'CMS Connection Status',
    connectionTitle: 'Prove Studio is connected',
    connectionBody:
      'Run a live read against the same AppSync CMS endpoint the public site uses. This does not edit content.',
    testConnection: 'Test CMS Connection',
    testingConnection: 'Testing connection...',
    connectionSuccess: 'Connected',
    connectionFailed: 'Connection failed',
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
      'Open Data Manager when you need to change live website content. Use the document publishing guide on this page when you need to route a new public file through the supported Studio PublicDocument workflow. Open Studio Home only if you need to get back to the main AWS Studio screen first.',
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
    noticesSummary: 'These come from the Announcement model.',
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
      'SiteSettings: homepage title and welcome text',
      'AlertBanner: emergency banner',
      'Announcement: notice cards',
      'Event: meetings and calendar items',
      'OfficialContact: public contact cards',
      'Business: business directory entries',
      'PublicDocument: use the Studio publishing guide to route the file and set the website section',
      'ExternalNewsLink: news links from outside sources',
      'EmailAlias: private email forwarding only',
    ],
    crudKicker: 'CRUD reference',
    crudTitle: 'Most CMS models get normal CRUD in Amplify Studio and AppSync',
    crudBody:
      'Amplify Studio Data Manager uses the AppSync-backed @model operations for the normal text-and-record models. PublicDocument records still exist in AppSync, and document publishing now routes staff into the supported Studio workflow instead of the retired custom uploader.',
    crudItems: [
      {
        model: 'SiteSettings',
        summary: 'Homepage title, hero text, and contact fields.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes: 'Keep one current record for the public site.',
      },
      {
        model: 'AlertBanner',
        summary: 'Emergency banner content and call-to-action.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes: 'Keep one enabled banner at a time.',
      },
      {
        model: 'Announcement',
        summary: 'Public notices, closures, and alerts.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes: 'Use the priority field to control display order.',
      },
      {
        model: 'Event',
        summary: 'Meetings, hearings, and calendar items.',
        operations: ['Create', 'Read', 'Update', 'Delete'],
        notes:
          'Set title, start, and active for every record. Add description and location for the meetings cards, use end when it is known, and remember the site sorts events by start date and time.',
      },
      {
        model: 'OfficialContact',
        summary: 'Public contact cards for town staff and offices.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes: 'Use displayOrder to arrange the public list.',
      },
      {
        model: 'Business',
        summary: 'Business directory entries with phone, website, and image.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes: 'Use displayOrder to keep featured businesses first.',
      },
      {
        model: 'PublicDocument',
        summary: 'Public forms, notices, and downloadable documents.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes:
          'Use the Studio publishing guide so file routing stays in the supported PublicDocument workflow.',
      },
      {
        model: 'ExternalNewsLink',
        summary: 'Outside news stories and regional updates.',
        operations: ['Create', 'Read', 'Update', 'Delete', 'Reorder'],
        notes: 'Use displayOrder to control the order shown on the page.',
      },
      {
        model: 'EmailAlias',
        summary: 'Private forwarding rules for town email addresses.',
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
      'Business',
      'PublicDocument',
      'ExternalNewsLink',
      'EmailAlias',
    ],
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
    noContactUpdates: 'Aun no se han recibido actualizaciones de contacto.',
    connectionKicker: 'Estado de conexion del CMS',
    connectionTitle: 'Comprobar que Studio esta conectado',
    connectionBody:
      'Ejecute una lectura en vivo contra el mismo endpoint AppSync del CMS que usa el sitio publico. Esto no edita contenido.',
    testConnection: 'Probar conexion del CMS',
    testingConnection: 'Probando conexion...',
    connectionSuccess: 'Conectado',
    connectionFailed: 'Fallo la conexion',
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
      'Abra Data Manager cuando necesite cambiar contenido en vivo. Abra la guia de publicacion de documentos cuando necesite dirigir un archivo publico por el flujo compatible de PublicDocument en Studio. Abra Studio Home solo si primero necesita volver a la pantalla principal de Studio.',
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
    noticesSummary: 'Estos provienen del modelo Announcement.',
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
      'SiteSettings: titulo de la pagina principal y texto de bienvenida',
      'AlertBanner: banner de emergencia',
      'Announcement: tarjetas de avisos',
      'Event: reuniones y elementos del calendario',
      'OfficialContact: tarjetas de contacto publico',
      'Business: entradas del directorio de negocios',
      'PublicDocument: use la guia de Studio para dirigir el archivo y definir la seccion del sitio',
      'ExternalNewsLink: enlaces de noticias externas',
      'EmailAlias: solo reenvio privado de correo',
    ],
    crudKicker: 'Referencia CRUD',
    crudTitle: 'La mayoria de los modelos del CMS tienen CRUD normal en Amplify Studio y AppSync',
    crudBody:
      'Amplify Studio Data Manager usa las operaciones @model soportadas por AppSync para los modelos normales de texto y registros. Los registros PublicDocument siguen existiendo en AppSync, y la publicacion de documentos ahora dirige al personal al flujo compatible de Studio en lugar del cargador personalizado retirado.',
    crudItems: [
      {
        model: 'SiteSettings',
        summary: 'Titulo de la pagina principal, texto del hero y campos de contacto.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes: 'Conserve un solo registro actual para el sitio publico.',
      },
      {
        model: 'AlertBanner',
        summary: 'Contenido del banner de emergencia y llamada a la accion.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes: 'Conserve un solo banner habilitado a la vez.',
      },
      {
        model: 'Announcement',
        summary: 'Avisos publicos, cierres y alertas.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes: 'Use el campo priority para controlar el orden.',
      },
      {
        model: 'Event',
        summary: 'Reuniones, audiencias y elementos del calendario.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar'],
        notes:
          'Configure title, start y active en cada registro. Agregue description y location para las tarjetas de reuniones, use end cuando se conozca y recuerde que el sitio ordena los eventos por fecha y hora de inicio.',
      },
      {
        model: 'OfficialContact',
        summary: 'Tarjetas de contacto publico para personal y oficinas.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes: 'Use displayOrder para ordenar la lista publica.',
      },
      {
        model: 'Business',
        summary: 'Entradas del directorio de negocios con telefono, sitio web e imagen.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes: 'Use displayOrder para mantener primero los negocios destacados.',
      },
      {
        model: 'PublicDocument',
        summary: 'Formularios publicos, avisos y documentos descargables.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes:
          'Use la guia de publicacion en Studio para que la ruta del archivo permanezca en el flujo compatible de PublicDocument.',
      },
      {
        model: 'ExternalNewsLink',
        summary: 'Noticias externas y actualizaciones regionales.',
        operations: ['Crear', 'Leer', 'Actualizar', 'Eliminar', 'Reordenar'],
        notes: 'Use displayOrder para controlar el orden mostrado.',
      },
      {
        model: 'EmailAlias',
        summary: 'Reglas privadas de reenvio para direcciones de correo del pueblo.',
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
      'Business',
      'PublicDocument',
      'ExternalNewsLink',
      'EmailAlias',
    ],
  },
};

@Component({
  selector: 'app-cms-admin',
  templateUrl: './cms-admin.html',
  styleUrl: './cms-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TabsModule, TableModule, ButtonModule, CardModule, TagModule, SkeletonModule],
})
export class CmsAdmin {
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
        label: 'AWS account',
        value: this.awsAccountId || 'Not configured',
        copyValue: this.awsAccountId,
      },
      {
        key: 'region',
        label: copy.regionLabel,
        value: this.awsRegion || 'Not configured',
        copyValue: this.awsRegion,
      },
      {
        key: 'amplify-app',
        label: 'Amplify app',
        value: this.amplifyAppId || 'Not configured',
        copyValue: this.amplifyAppId,
      },
      {
        key: 'aws-console',
        label: copy.openAwsConsole,
        value: this.awsConsoleUrl,
        copyValue: this.awsConsoleUrl,
      },
      {
        key: 'studio-url',
        label: copy.openAmplify,
        value: this.studioUrl,
        copyValue: this.studioUrl,
      },
      {
        key: 'data-manager-url',
        label: copy.openCmsEditPage,
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
          },
          { action: 'Banner de emergencia en la pagina principal', model: 'AlertBanner' },
          { action: 'Avisos publicos, cierres y anuncios generales', model: 'Announcement' },
          { action: 'Reuniones, audiencias y calendario', model: 'Event' },
          { action: 'Tarjetas de contacto del personal', model: 'OfficialContact' },
          { action: 'Directorio de negocios, logos y sitios web', model: 'Business' },
          { action: 'Documentos publicos, formularios y descargas', model: 'PublicDocument' },
          { action: 'Noticias externas compartidas en el sitio', model: 'ExternalNewsLink' },
          { action: 'Reglas internas de reenvio de correo', model: 'EmailAlias' },
        ]
      : [
          { action: 'Homepage title, welcome text, and hero photo', model: 'SiteSettings' },
          { action: 'Emergency banner shown at the top of the homepage', model: 'AlertBanner' },
          { action: 'Public notices, closures, and general announcements', model: 'Announcement' },
          { action: 'Meetings, hearings, and calendar events', model: 'Event' },
          { action: 'Staff contact cards for names, phones, and emails', model: 'OfficialContact' },
          { action: 'Business directory entries, logos, and websites', model: 'Business' },
          { action: 'Public documents, forms, and downloads', model: 'PublicDocument' },
          { action: 'Outside news links shared on the site', model: 'ExternalNewsLink' },
          {
            action: 'Town email forwarding rules for behind-the-scenes delivery',
            model: 'EmailAlias',
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

    try {
      this.contactUpdates.set(await this.contactUpdateReview.getAllUpdates());
    } finally {
      this.contactUpdatesLoading.set(false);
    }
  }

  private buildDataManagerUrl(): string {
    const region = this.clerkSetupConfig.awsRegion;
    const appId = this.clerkSetupConfig.amplifyAppId;

    if (!region || !appId) {
      return this.clerkSetupConfig.studioUrl;
    }

    return `https://${region}.console.aws.amazon.com/amplify/home?region=${region}#/${appId}/main/studio/data`;
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
