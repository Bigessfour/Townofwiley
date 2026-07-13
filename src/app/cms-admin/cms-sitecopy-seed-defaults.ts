/** Default active SiteCopy rows — keep in sync with `scripts/seed-cms-production-data.py`. */

export interface CmsSiteCopySeedRow {
  id: string;
  key: string;
  valueEn: string;
  valueEs: string;
  description: string;
  displayOrder: number;
}

export const CMS_SITECOPY_SEED_DEFAULTS: readonly CmsSiteCopySeedRow[] = [
  {
    id: 'topTasksKicker',
    key: 'topTasksKicker',
    valueEn: 'Quick Tasks',
    valueEs: 'Tareas rapidas',
    description: 'Homepage “Quick Tasks” kicker above How do I…',
    displayOrder: 1,
  },
  {
    id: 'topTasksHeading',
    key: 'topTasksHeading',
    valueEn: 'How do I...',
    valueEs: 'Como puedo...',
    description: 'Homepage “How do I…” section heading',
    displayOrder: 2,
  },
  {
    id: 'contactTownHallAddress',
    key: 'contactTownHallAddress',
    valueEn: '304 Main Street, Wiley, CO 81092',
    valueEs: '304 Main Street, Wiley, CO 81092',
    description: 'Town Hall card street address on /contact',
    displayOrder: 10,
  },
  {
    id: 'contactTownHallPhone',
    key: 'contactTownHallPhone',
    valueEn: '(719) 829-4974',
    valueEs: '(719) 829-4974',
    description: 'Town Hall card phone number on /contact',
    displayOrder: 11,
  },
] as const;