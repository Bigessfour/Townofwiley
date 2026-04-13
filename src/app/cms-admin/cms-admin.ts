import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

interface CmsAdminRuntimeConfig {
  cms?: {
    appSync?: {
      apiEndpoint?: string;
      apiKey?: string;
    };
  };
}

interface CmsAdminCopy {
  kicker: string;
  title: string;
  intro: string;
  returnHome: string;
  openSetupPage: string;
  openAmplify: string;
  openCmsEditPage: string;
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
      'Use Amplify Studio Data Manager for daily website updates across the normal CMS models. PublicDocument files are the exception: upload those from the clerk page document uploader so they land in the correct website section.',
    returnHome: 'Return to homepage',
    openSetupPage: 'Open clerk instructions',
    openAmplify: 'Open Studio Home',
    openCmsEditPage: 'Open CMS edit page',
    quickReferenceKicker: 'Quick reference',
    quickReferenceTitle: 'Copy of the clerk instructions',
    quickReferenceBody:
      'Use this short checklist when you only need a reminder. The direct CMS link opens Amplify Studio Data Manager for normal CMS models, but document files still go through the clerk page uploader.',
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
      'Open Data Manager when you need to change live website content. Open Studio Home only if you need to get back to the main AWS Studio screen first. PublicDocument files do not have a native upload control there, so use the clerk page uploader for documents.',
    accessChecklist: [
      'Use Data Manager for everyday edits.',
      'Use the clerk page Document Upload tab for PublicDocument files.',
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
      'Open Data Manager for text and record changes, or open the clerk page for document uploads.',
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
      'PublicDocument: upload from the clerk page; the uploader creates the CMS record and section mapping',
      'ExternalNewsLink: news links from outside sources',
      'EmailAlias: private email forwarding only',
    ],
    crudKicker: 'CRUD reference',
    crudTitle: 'Most CMS models get normal CRUD in Amplify Studio and AppSync',
    crudBody:
      'Amplify Studio Data Manager uses the AppSync-backed @model operations for the normal text-and-record models. PublicDocument records still exist in AppSync, but file uploads go through the custom clerk workflow because Studio Data Manager does not provide a document picker here.',
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
        notes: 'The site sorts events by start date and time.',
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
        notes: 'Upload files from the clerk page Document Upload tab. That flow creates the PublicDocument record and routes it to the correct section.',
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
    routeKicker: 'Read-only Admin Route',
    routeTitle: 'Do not edit the website on this page',
    routeBody:
      'This page shows guidance and current CMS status only. It does not save or publish website content.',
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
      'Use Amplify Studio Data Manager para los cambios diarios en los modelos normales del CMS. Los archivos de PublicDocument son la excepcion: subalos desde el cargador de documentos en la pagina de secretaria para que lleguen a la seccion correcta del sitio.',
    returnHome: 'Volver a la pagina principal',
    openSetupPage: 'Abrir instrucciones del personal',
    openAmplify: 'Abrir Studio Home',
    openCmsEditPage: 'Abrir pagina de edicion del CMS',
    quickReferenceKicker: 'Referencia rapida',
    quickReferenceTitle: 'Copia de las instrucciones de la secretaria',
    quickReferenceBody:
      'Use esta lista corta cuando solo necesite un recordatorio. El enlace directo del CMS abre Amplify Studio Data Manager para los modelos normales del CMS, pero los archivos de documentos siguen usando el cargador de la pagina de secretaria.',
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
      'Abra Data Manager cuando necesite cambiar contenido en vivo. Abra Studio Home solo si primero necesita volver a la pantalla principal de Studio. Los archivos de PublicDocument no tienen un cargador nativo alli, por eso deben subirse desde la pagina de secretaria.',
    accessChecklist: [
      'Use Data Manager para las ediciones diarias.',
      'Use la pestana Document Upload en la pagina de secretaria para los archivos de PublicDocument.',
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
      'Abra Data Manager para cambios de texto y registros, o abra la pagina de secretaria para subir documentos.',
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
      'PublicDocument: suba el archivo desde la pagina de secretaria; el cargador crea el registro y la seccion correcta',
      'ExternalNewsLink: enlaces de noticias externas',
      'EmailAlias: solo reenvio privado de correo',
    ],
    crudKicker: 'Referencia CRUD',
    crudTitle: 'La mayoria de los modelos del CMS tienen CRUD normal en Amplify Studio y AppSync',
    crudBody:
      'Amplify Studio Data Manager usa las operaciones @model soportadas por AppSync para los modelos normales de texto y registros. Los registros PublicDocument siguen existiendo en AppSync, pero la carga de archivos pasa por el flujo personalizado de la secretaria porque Studio Data Manager no ofrece un selector de documentos aqui.',
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
        notes: 'El sitio ordena los eventos por fecha y hora de inicio.',
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
        notes: 'Suba archivos desde la pestana Document Upload en la pagina de secretaria. Ese flujo crea el registro PublicDocument y lo dirige a la seccion correcta.',
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
})
export class CmsAdmin {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  private readonly appSyncRuntimeConfig = (() => {
    if (typeof window === 'undefined') {
      return { apiEndpoint: '', apiKey: '' };
    }

    const runtimeConfig = window.__TOW_RUNTIME_CONFIG__ as CmsAdminRuntimeConfig | undefined;
    const appSync = runtimeConfig?.cms?.appSync;

    return {
      apiEndpoint: typeof appSync?.apiEndpoint === 'string' ? appSync.apiEndpoint : '',
      apiKey: typeof appSync?.apiKey === 'string' ? appSync.apiKey : '',
    };
  })();

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
  protected readonly studioUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/home';
  protected readonly cmsEditUrl =
    'https://us-east-2.admin.amplifyapp.com/admin/login?appId=d331voxr1fhoir&code=9936b78d-30f3-4383-9ce5-fee3804ac0a6&sessionId=bdf7662f-07eb-40ef-8c2f-73f9752f0a60&backendEnvironmentName=main';
  protected readonly clerkSetupUrl = '/clerk-setup';
}
