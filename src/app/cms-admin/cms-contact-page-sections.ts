import {
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
  OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT,
} from '../site-cms-content';
import { TOWN_HALL_SITE_COPY_KEYS } from '../site-copy-overrides';
import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from '../leadership-roster-group-ids';
import type { ContactPageSection } from './cms-clerk-record-editor-options';

const CONTACT_ORIGIN = 'https://townofwiley.gov';

function labelText(record: Record<string, unknown>): string {
  return String(record['label'] ?? '').toLowerCase();
}

export function matchStaffEmailRecord(record: Record<string, unknown>): boolean {
  const id = String(record['id'] ?? '');
  if (id === OFFICIAL_CONTACT_ID_CITY_CLERK || id === OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT) {
    return true;
  }
  const label = labelText(record);
  if (label.includes('information') || label.includes('agenda')) {
    return false;
  }
  return label.includes('clerk') || label.includes('superintendent');
}

export function matchAgendaNoteRecord(record: Record<string, unknown>): boolean {
  const id = String(record['id'] ?? '');
  if (id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION) {
    return true;
  }
  const label = labelText(record);
  return label.includes('information') || label.includes('agenda') || label.includes('town business');
}

export function staffEmailRecordLabel(record: Record<string, unknown>): string {
  const id = String(record['id'] ?? '');
  const label = labelText(record);
  if (id === OFFICIAL_CONTACT_ID_CITY_CLERK || label.includes('clerk')) {
    return 'Clerk email';
  }
  if (id === OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT || label.includes('superintendent')) {
    return 'Superintendent email';
  }
  return String(record['label'] ?? 'Staff email');
}

/** One card per block on the public /contact page. */
export const CONTACT_PAGE_SECTIONS: readonly ContactPageSection[] = [
  {
    id: 'town-hall',
    title: 'Town Hall address, phone, and hours',
    description: 'The visit card at the top of the Contact page.',
    help: 'Pick the line to change (address, phone, hours, or the Town Hall heading). Then Save.',
    editorTaskId: 'edit-site-copy',
    editorOptions: {
      allowedSiteCopyKeys: TOWN_HALL_SITE_COPY_KEYS,
      hideAddNew: false,
      liveSiteUrl: `${CONTACT_ORIGIN}/contact#contact-town-hall`,
      useRecordLiveLink: false,
      titleOverride: 'Edit Town Hall visit information',
      purposeOverride: '',
      leadOverride:
        'This is the Town Hall card residents see first on /contact. Choose which line to change, then Save.',
    },
  },
  {
    id: 'admin-names',
    title: 'Town Administration names',
    description: 'Clerk, Deputy Clerk, and Superintendent names in the staff table.',
    help: 'Click Edit on the existing name. Do not add a second row to replace “To Be Announced”.',
    editorTaskId: 'update-leadership',
    editorOptions: {
      lockedGroupId: LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
      liveSiteUrl: `${CONTACT_ORIGIN}/contact#contact-administration`,
      titleOverride: 'Edit staff names',
      purposeOverride: '',
      leadOverride:
        'These names appear in the Town Administration table on /contact. Edit the existing line — do not add a duplicate.',
    },
  },
  {
    id: 'staff-emails',
    title: 'Staff emails',
    description: 'The email column next to Clerk and Superintendent.',
    help: 'Edit Clerk email or Superintendent email. Names are changed in Town Administration names.',
    editorTaskId: 'update-contacts',
    editorOptions: {
      recordMatch: matchStaffEmailRecord,
      hideAddNew: true,
      visibleFieldNames: ['href', 'linkLabel'],
      liveSiteUrl: `${CONTACT_ORIGIN}/contact#contact-administration`,
      titleOverride: 'Edit staff emails',
      purposeOverride: '',
      leadOverride:
        'This is the email column on the Town Administration table. Change the email address and the clickable text.',
      recordLabel: staffEmailRecordLabel,
    },
  },
  {
    id: 'agenda-note',
    title: 'Note under Town Administration',
    description: 'The extra paragraph under the staff table (agenda / Town Information).',
    help: 'Change the note residents read. This is not the staff names or emails.',
    editorTaskId: 'update-contacts',
    editorOptions: {
      recordMatch: matchAgendaNoteRecord,
      hideAddNew: true,
      autoEditRecordId: OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
      visibleFieldNames: ['detail'],
      liveSiteUrl: `${CONTACT_ORIGIN}/contact#contact-town-information`,
      useRecordLiveLink: false,
      titleOverride: 'Edit the note under Town Administration',
      purposeOverride: '',
      leadOverride: 'This paragraph appears under the staff table on /contact.',
      recordLabel: () => 'Note under Town Administration',
    },
  },
  {
    id: 'elected',
    title: 'Mayor and Trustees',
    description: 'Names under Elected Officials on the Contact page.',
    help: 'Click Edit on a name to change it, or drag to reorder. Then Save if you edited a line.',
    editorTaskId: 'update-leadership',
    editorOptions: {
      lockedGroupId: LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
      liveSiteUrl: `${CONTACT_ORIGIN}/contact#leadership`,
      titleOverride: 'Edit Mayor and Trustees',
      purposeOverride: '',
      leadOverride:
        'These names appear under Elected Officials on /contact. Edit an existing line to change a person.',
    },
  },
];

export function contactPageSectionById(
  id: ContactPageSection['id'],
): ContactPageSection | undefined {
  return CONTACT_PAGE_SECTIONS.find((section) => section.id === id);
}
