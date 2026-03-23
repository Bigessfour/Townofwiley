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
  openDataManager: string;
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
    kicker: 'Amplify Studio CMS',
    title: 'Amplify Studio is the only CMS for homepage publishing',
    intro:
      'Browser-local editing has been disabled. Homepage text, the alert banner, notice cards, calendar events, and public contact cards now come only from Amplify Studio and AppSync.',
    returnHome: 'Return to homepage',
    openSetupPage: 'Open Clerk Setup Page',
    openAmplify: 'Open Studio Home',
    openDataManager: 'Open Data Manager',
    statusAriaLabel: 'CMS status',
    accessKicker: 'Clerk Access',
    accessTitle: 'Direct links for the live Town CMS',
    accessBody:
      'The live Amplify app is Townofwiley in us-east-2. Share these links with a clerk who already has AWS console access to the Town AWS account.',
    accessChecklist: [
      'Open Studio Home first, then use Data Manager for record editing.',
      'If the clerk does not yet have AWS console access to the Town AWS account, provision that first.',
      'There are currently no separate CMS-only Cognito users provisioned for Studio access.',
      'Use Data Manager to edit SiteSettings, AlertBanner, Announcement, Event, OfficialContact, and EmailAlias records.',
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
    aliasTitle: 'Use the EmailAlias model for private forwarding rules',
    aliasBody:
      'EmailAlias records stay private in Amplify Studio. They map a public townofwiley.gov address such as steve.mckitrick@townofwiley.gov to the staff member\'s current destination inbox without exposing that forwarding target on the public site.',
    aliasChecklist: [
      'Add or update the EmailAlias record in Amplify Studio Data Manager.',
      'Set aliasAddress to the public townofwiley.gov mailbox and destinationAddress to the staff member\'s current inbox.',
      'Keep public contact cards in OfficialContact and keep forwarding targets only in EmailAlias.',
      'After saving, verify the SES alias forwarder with a live test message.',
    ],
    publishingKicker: 'Publishing Flow',
    publishingTitle: 'How to update the homepage now',
    publishingSteps: [
      'Open Amplify Studio from the AWS console.',
      'Update the SiteSettings, AlertBanner, Announcement, Event, OfficialContact, or EmailAlias record.',
      'Save the record in Studio.',
      'Refresh the public homepage and confirm the change.',
    ],
    modelMapKicker: 'Model Map',
    modelMapTitle: 'Which Studio models control which parts of the homepage',
    modelMapItems: [
      'SiteSettings: homepage title, hero copy, welcome text',
      'AlertBanner: emergency banner visibility and text',
      'Announcement: notice cards on the homepage',
      'Event: live calendar cards and public event timing',
      'OfficialContact: public contact cards',
      'EmailAlias: private-only town mailbox forwarding targets',
    ],
    routeKicker: 'Read-only Admin Route',
    routeTitle: 'This page is now a CMS operations guide, not an editor',
    routeBody:
      'The old browser-only CMS path has been removed so homepage content cannot drift by device or browser session.',
    snapshotKicker: 'Current Snapshot',
    snapshotChecklist: [
      'Refresh this page after Studio edits to confirm the latest public content.',
      'If content does not change, verify the AppSync runtime config and the saved Studio record.',
      'Use the public homepage as the final verification surface for residents.',
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
    modelCoverageLabel: 'Homepage models verified',
    modelCoverageItems: [
      'SiteSettings',
      'AlertBanner',
      'Announcement',
      'Event',
      'OfficialContact',
      'EmailAlias',
    ],
  },
  es: {
    kicker: 'CMS de Amplify Studio',
    title: 'Amplify Studio es el unico CMS para publicar la pagina principal',
    intro:
      'La edicion local en el navegador fue deshabilitada. El texto de la pagina principal, el banner de alerta, las tarjetas de avisos, los eventos del calendario y las tarjetas de contacto publico ahora vienen solo de Amplify Studio y AppSync.',
    returnHome: 'Volver a la pagina principal',
    openSetupPage: 'Abrir pagina de acceso del personal',
    openAmplify: 'Abrir Studio Home',
    openDataManager: 'Abrir Data Manager',
    statusAriaLabel: 'Estado del CMS',
    accessKicker: 'Acceso del personal',
    accessTitle: 'Enlaces directos para el CMS en vivo del pueblo',
    accessBody:
      'La aplicacion Amplify en vivo es Townofwiley en us-east-2. Comparta estos enlaces con la persona que ya tenga acceso a la consola de AWS de la cuenta del pueblo.',
    accessChecklist: [
      'Abra primero Studio Home y despues use Data Manager para editar registros.',
      'Si la persona todavia no tiene acceso a la consola de AWS de la cuenta del pueblo, primero otorgue ese acceso.',
      'Actualmente no hay usuarios separados de Cognito creados solo para Studio.',
      'Use Data Manager para editar los registros de SiteSettings, AlertBanner, Announcement, Event, OfficialContact y EmailAlias.',
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
    aliasTitle: 'Use el modelo EmailAlias para reglas privadas de reenvio',
    aliasBody:
      'Los registros de EmailAlias permanecen privados en Amplify Studio. Vinculan una direccion publica townofwiley.gov como steve.mckitrick@townofwiley.gov con la bandeja actual del empleado sin exponer ese destino en el sitio publico.',
    aliasChecklist: [
      'Agregue o actualice el registro EmailAlias en Amplify Studio Data Manager.',
      'Configure aliasAddress con el buzon publico townofwiley.gov y destinationAddress con la bandeja actual del empleado.',
      'Mantenga las tarjetas publicas en OfficialContact y deje los destinos de reenvio solo en EmailAlias.',
      'Despues de guardar, verifique el reenviador SES con un mensaje real de prueba.',
    ],
    publishingKicker: 'Flujo de publicacion',
    publishingTitle: 'Como actualizar ahora la pagina principal',
    publishingSteps: [
      'Abra Amplify Studio desde la consola de AWS.',
      'Actualice el registro de SiteSettings, AlertBanner, Announcement, Event, OfficialContact o EmailAlias.',
      'Guarde el registro en Studio.',
      'Actualice la pagina principal publica y confirme el cambio.',
    ],
    modelMapKicker: 'Mapa de modelos',
    modelMapTitle: 'Que modelos de Studio controlan cada parte de la pagina principal',
    modelMapItems: [
      'SiteSettings: titulo de la pagina principal, texto hero y bienvenida',
      'AlertBanner: visibilidad y texto del banner de emergencia',
      'Announcement: tarjetas de avisos en la pagina principal',
      'Event: tarjetas del calendario en vivo y horario publico',
      'OfficialContact: tarjetas de contacto publico',
      'EmailAlias: destinos privados de reenvio para buzones del pueblo',
    ],
    routeKicker: 'Ruta administrativa de solo lectura',
    routeTitle: 'Esta pagina ahora es una guia operativa del CMS, no un editor',
    routeBody:
      'La antigua ruta del CMS solo en el navegador fue eliminada para que el contenido de la pagina principal no cambie por dispositivo o sesion.',
    snapshotKicker: 'Captura actual',
    snapshotChecklist: [
      'Actualice esta pagina despues de editar en Studio para confirmar el contenido publico mas reciente.',
      'Si el contenido no cambia, verifique la configuracion de tiempo de ejecucion de AppSync y el registro guardado en Studio.',
      'Use la pagina principal publica como superficie final de verificacion para residentes.',
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
    modelCoverageLabel: 'Modelos de pagina principal verificados',
    modelCoverageItems: [
      'SiteSettings',
      'AlertBanner',
      'Announcement',
      'Event',
      'OfficialContact',
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
  protected readonly dataManagerUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir/main/studio/data';
  protected readonly clerkSetupUrl = '/clerk-setup';
}
