import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { APP_COPY, type AppCopy, type LeadershipGroup } from '../app';
import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from '../leadership-roster-group-ids';
import {
  type CmsContact,
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
  OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT,
} from '../site-cms-content';
import { SiteLanguageService } from '../site-language';
import {
  applyAppCopySiteCopyOverrides,
  resolveSiteCopyLabel,
  siteCopyTelHref,
} from '../site-copy-overrides';

const DEFAULT_TOWN_HALL_ADDRESS = '304 Main Street, Wiley, CO 81092';
const DEFAULT_TOWN_HALL_PHONE = '(719) 829-4974';

/** Roster member with the AppSync record id when sourced from CMS (absent for bundled fallback). */
export interface ContactLeadershipMember {
  id?: string;
  line: string;
}

export type ContactLeadershipGroup = LeadershipGroup & { members: ContactLeadershipMember[] };

export interface ParsedRosterLine {
  raw: string;
  role: string;
  name: string;
  href?: string;
  linkLabel?: string;
  /** AppSync record id of the underlying `LeadershipRosterEntry` row when known. */
  rosterId?: string;
  /** AppSync record id of the matching `OfficialContact` (e.g. `city-clerk`) when known. */
  contactId?: string;
}

/**
 * Split "Role: Name" or "Role - Name" into parts. Colon wins when both appear.
 * Live CMS rows often use an en dash / hyphen separator.
 */
export function parseRosterLine(line: string): { role: string; name: string } {
  const trimmed = line.trim();
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex !== -1) {
    return {
      role: trimmed.slice(0, colonIndex).trim(),
      name: trimmed.slice(colonIndex + 1).trim(),
    };
  }

  const hyphenMatch = trimmed.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (hyphenMatch) {
    return {
      role: hyphenMatch[1].trim(),
      name: hyphenMatch[2].trim(),
    };
  }

  return { role: trimmed, name: '' };
}

function contactForAdminRole(
  role: string,
  contacts: readonly CmsContact[],
): CmsContact | undefined {
  const normalized = role.toLowerCase();
  if (normalized.includes('clerk') || normalized.includes('secretaria')) {
    return contacts.find((contact) => contact.id === OFFICIAL_CONTACT_ID_CITY_CLERK);
  }

  if (normalized.includes('superintendent') || normalized.includes('superintendente')) {
    return contacts.find((contact) => contact.id === OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT);
  }

  return undefined;
}

/** Attach mailto only — do not copy OfficialContact.detail onto every roster row. */
export function enrichAdminRosterLine(
  member: ContactLeadershipMember,
  contacts: readonly CmsContact[],
): ParsedRosterLine {
  const parsed = parseRosterLine(member.line);
  const contact = contactForAdminRole(parsed.role, contacts);

  return {
    raw: member.line,
    role: parsed.role,
    name: parsed.name,
    href: contact?.href,
    linkLabel:
      contact?.linkLabel ??
      (contact?.href?.startsWith('mailto:') ? contact.href.replace('mailto:', '') : undefined),
    rosterId: member.id,
    contactId: contact?.id,
  };
}

@Component({
  selector: 'app-contact-page',
  imports: [RouterLink, SkeletonModule],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed((): AppCopy => {
    const lang = this.siteLanguageService.currentLanguage() || 'en';
    const base = APP_COPY[lang];
    return applyAppCopySiteCopyOverrides(base, (key) => this.cmsStore.getSiteCopy(key), lang);
  });

  protected readonly townHallAddress = computed(() => {
    const lang = this.siteLanguageService.currentLanguage() || 'en';
    return resolveSiteCopyLabel(
      (key) => this.cmsStore.getSiteCopy(key),
      lang,
      'contactTownHallAddress',
      DEFAULT_TOWN_HALL_ADDRESS,
    );
  });

  protected readonly townHallPhone = computed(() => {
    const lang = this.siteLanguageService.currentLanguage() || 'en';
    return resolveSiteCopyLabel(
      (key) => this.cmsStore.getSiteCopy(key),
      lang,
      'contactTownHallPhone',
      DEFAULT_TOWN_HALL_PHONE,
    );
  });

  protected readonly townHallPhoneHref = computed(() =>
    siteCopyTelHref(this.townHallPhone(), DEFAULT_TOWN_HALL_PHONE),
  );
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly contacts = this.cmsStore.contacts;

  protected readonly leadershipGroups = computed<ContactLeadershipGroup[]>(() => {
    const base = this.copy().leadershipGroups;
    const cmsMap = this.cmsStore.leadershipRosterEntriesByGroup();

    return base.map((group) => {
      const cmsEntries = cmsMap.get(group.groupId) ?? [];
      const members: ContactLeadershipMember[] = cmsEntries.map((entry) => ({
        id: entry.id,
        line: entry.line,
      }));
      return { ...group, members };
    });
  });

  protected readonly townInformationContact = computed(() =>
    this.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION),
  );

  protected readonly agendaNoteDetail = computed(() => {
    const detail = this.townInformationContact()?.detail?.trim();
    return detail || null;
  });

  protected readonly administrationGroup = computed(
    () =>
      this.leadershipGroups().find(
        (group) => group.groupId === LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
      ) ?? null,
  );

  protected readonly administrationMembers = computed(() => {
    const group = this.administrationGroup();
    if (!group?.members.length) {
      return [] as ParsedRosterLine[];
    }

    return group.members.map((member) => enrichAdminRosterLine(member, this.contacts()));
  });

  protected readonly electedOfficialsGroup = computed(
    () =>
      this.leadershipGroups().find(
        (group) => group.groupId === LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
      ) ?? null,
  );

  protected readonly electedOfficialLines = computed(() => {
    const group = this.electedOfficialsGroup();
    if (!group?.members.length) {
      return [] as ParsedRosterLine[];
    }

    return group.members.map((member) => ({
      raw: member.line,
      rosterId: member.id,
      ...parseRosterLine(member.line),
    }));
  });
}
