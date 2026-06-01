/** Minimal PublicDocument rows for Playwright when cms-snapshot.json ships empty. */
export const E2E_PUBLIC_DOCUMENT_RECORDS = [
  {
    id: 'city-council-meeting-access-guide',
    sectionId: 'meeting-documents',
    title: 'City Council Meeting Access Guide',
    titleEs: 'Guia de acceso a reuniones del concejo municipal',
    summary:
      'A public meeting-reference file covering the second-Monday meeting schedule, agenda timing, packet follow-up, and approved-minute routing.',
    summaryEs:
      'Una guia publica sobre la reunion del segundo lunes, los tiempos de agenda, el seguimiento de paquetes y la ruta para minutas aprobadas.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/city-council-meeting-access-guide.html',
    downloadFileName: 'city-council-meeting-access-guide.html',
    keywords: ['city council', 'meeting', 'agenda', 'packet', 'minutes', 'second monday'],
    active: true,
    displayOrder: 20,
  },
  {
    id: 'budget-and-annual-reports-guide',
    sectionId: 'financial-documents',
    title: 'Budget and Annual Reports Guide',
    titleEs: 'Guia de presupuesto e informes anuales',
    summary:
      'A resident-facing guide that explains where budget summaries and annual reports belong and how to request current finance documents.',
    summaryEs:
      'Una guia para residentes que explica donde encontrar resumenes de presupuesto e informes anuales y como solicitar documentos financieros actuales.',
    status: 'Published guide',
    statusEs: 'Guia publicada',
    format: 'HTML reference',
    href: '/documents/archive/budget-and-annual-reports-guide.html',
    downloadFileName: 'budget-and-annual-reports-guide.html',
    keywords: ['budget', 'annual report', 'finance', 'audit', 'town budget'],
    active: true,
    displayOrder: 30,
  },
] as const;
