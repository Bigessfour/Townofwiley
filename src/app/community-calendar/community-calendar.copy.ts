import type { CommunityEventCategory } from './community-calendar.types';

export interface CommunityCalendarCopy {
  pageKicker: string;
  pageHeading: string;
  pageIntro: string;
  sourceFilterLabel: string;
  sourceFilterAll: string;
  sourceFilterOfficial: string;
  sourceFilterCommunity: string;
  officialBadge: string;
  communityBadge: string;
  calendarClickHint: string;
  calendarSelectionHeading: string;
  calendarSelectionClose: string;
  listHeading: string;
  monthHeading: string;
  emptyState: string;
  loadingLabel: string;
  loadError: string;
  retryLabel: string;
  filterAllLabel: string;
  filterLabel: string;
  submitHeading: string;
  submitIntro: string;
  submitButtonLabel: string;
  submittingLabel: string;
  submitSuccessSummary: string;
  submitSuccessDetail: string;
  submitErrorSummary: string;
  submitUnavailableDetail: string;
  googleActionLabel: string;
  icsActionLabel: string;
  socialLinkLabel: string;
  categoryLabels: Record<CommunityEventCategory, string>;
  fields: {
    submitterName: string;
    submitterPhone: string;
    submitterEmail: string;
    location: string;
    title: string;
    startDateTime: string;
    endDateTime: string;
    description: string;
    category: string;
    organizerName: string;
    socialLink: string;
    audience: string;
    cost: string;
    accessibilityNotes: string;
  };
  requiredHint: string;
}

export const COMMUNITY_CALENDAR_COPY: Record<'en' | 'es', CommunityCalendarCopy> = {
  en: {
    pageKicker: 'Community',
    pageHeading: 'Community events',
    pageIntro:
      'Yard sales, bake sales, school events, fundraisers, and other community gatherings in Wiley.',
    sourceFilterLabel: 'Show on calendar',
    sourceFilterAll: 'All',
    sourceFilterOfficial: 'Official meetings',
    sourceFilterCommunity: 'Community',
    officialBadge: 'Official',
    communityBadge: 'Community',
    calendarClickHint: 'Select an event on the calendar to see details.',
    calendarSelectionHeading: 'Selected event',
    calendarSelectionClose: 'Clear selection',
    listHeading: 'Upcoming community events',
    monthHeading: 'Month view',
    emptyState:
      'No upcoming community events are posted yet. Check back soon, or submit one below.',
    loadingLabel: 'Loading community events…',
    loadError: 'We could not load community events right now.',
    retryLabel: 'Try again',
    filterAllLabel: 'All categories',
    filterLabel: 'Filter by category',
    submitHeading: 'Submit a community event',
    submitIntro:
      'Tell us about your community event. The Town Clerk will review it before it appears on this calendar.',
    submitButtonLabel: 'Submit for Clerk review',
    submittingLabel: 'Sending…',
    submitSuccessSummary: 'Submission received',
    submitSuccessDetail: 'Thank you. The Town Clerk will review your event.',
    submitErrorSummary: 'Could not submit',
    submitUnavailableDetail:
      'The community calendar service is not configured yet. Email clerk@townofwiley.gov to share your event.',
    googleActionLabel: 'Add to Google Calendar',
    icsActionLabel: 'Download ICS',
    socialLinkLabel: 'Event link',
    categoryLabels: {
      yard_sale: 'Yard sale',
      bake_sale: 'Bake sale / food',
      car_wash: 'Car wash',
      school: 'School event',
      fundraiser: 'Fundraiser / charity',
      gathering: 'Community gathering',
      festival: 'Festival / celebration',
      sports: 'Sports / recreation',
      other: 'Other',
    },
    fields: {
      submitterName: 'Your full name',
      submitterPhone: 'Phone number',
      submitterEmail: 'Email address',
      location: 'Event location / address',
      title: 'Event name',
      startDateTime: 'Start date and time',
      endDateTime: 'End date and time (optional)',
      description: 'Short description',
      category: 'Category',
      organizerName: 'Organizer or group name (optional)',
      socialLink: 'Social / Facebook event link (optional)',
      audience: 'Expected audience (optional)',
      cost: 'Cost (optional)',
      accessibilityNotes: 'Accessibility notes (optional)',
    },
    requiredHint: 'Required fields are marked.',
  },
  es: {
    pageKicker: 'Comunidad',
    pageHeading: 'Eventos comunitarios',
    pageIntro:
      'Ventas de garaje, ventas de comida, eventos escolares, recaudaciones y otras reuniones comunitarias en Wiley.',
    sourceFilterLabel: 'Mostrar en el calendario',
    sourceFilterAll: 'Todos',
    sourceFilterOfficial: 'Reuniones oficiales',
    sourceFilterCommunity: 'Comunidad',
    officialBadge: 'Oficial',
    communityBadge: 'Comunidad',
    calendarClickHint: 'Seleccione un evento en el calendario para ver los detalles.',
    calendarSelectionHeading: 'Evento seleccionado',
    calendarSelectionClose: 'Borrar selección',
    listHeading: 'Eventos comunitarios próximos',
    monthHeading: 'Vista mensual',
    emptyState: 'Todavía no hay eventos comunitarios próximos. Vuelva pronto o envíe uno abajo.',
    loadingLabel: 'Cargando eventos comunitarios…',
    loadError: 'No pudimos cargar los eventos comunitarios ahora.',
    retryLabel: 'Intentar de nuevo',
    filterAllLabel: 'Todas las categorías',
    filterLabel: 'Filtrar por categoría',
    submitHeading: 'Enviar un evento comunitario',
    submitIntro:
      'Cuéntenos sobre su evento comunitario. La secretaria del pueblo lo revisará antes de que aparezca en este calendario.',
    submitButtonLabel: 'Enviar para revisión',
    submittingLabel: 'Enviando…',
    submitSuccessSummary: 'Envío recibido',
    submitSuccessDetail: 'Gracias. La secretaria del pueblo revisará su evento.',
    submitErrorSummary: 'No se pudo enviar',
    submitUnavailableDetail:
      'El servicio del calendario comunitario aún no está configurado. Escriba a clerk@townofwiley.gov para compartir su evento.',
    googleActionLabel: 'Agregar a Google Calendar',
    icsActionLabel: 'Descargar ICS',
    socialLinkLabel: 'Enlace del evento',
    categoryLabels: {
      yard_sale: 'Venta de garaje',
      bake_sale: 'Venta de comida',
      car_wash: 'Lavado de autos',
      school: 'Evento escolar',
      fundraiser: 'Recaudación / caridad',
      gathering: 'Reunión comunitaria',
      festival: 'Festival / celebración',
      sports: 'Deportes / recreación',
      other: 'Otro',
    },
    fields: {
      submitterName: 'Nombre completo',
      submitterPhone: 'Número de teléfono',
      submitterEmail: 'Correo electrónico',
      location: 'Ubicación / dirección del evento',
      title: 'Nombre del evento',
      startDateTime: 'Fecha y hora de inicio',
      endDateTime: 'Fecha y hora de fin (opcional)',
      description: 'Descripción breve',
      category: 'Categoría',
      organizerName: 'Organizador o grupo (opcional)',
      socialLink: 'Enlace social / Facebook (opcional)',
      audience: 'Público esperado (opcional)',
      cost: 'Costo (opcional)',
      accessibilityNotes: 'Notas de accesibilidad (opcional)',
    },
    requiredHint: 'Los campos obligatorios están marcados.',
  },
};
