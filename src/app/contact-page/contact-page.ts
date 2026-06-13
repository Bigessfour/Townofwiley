import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { SkeletonModule } from 'primeng/skeleton';
import { APP_COPY, type LeadershipGroup } from '../app';
import {
  type CmsContact,
  LocalizedCmsContentStore,
  OFFICIAL_CONTACT_ID_CITY_CLERK,
  OFFICIAL_CONTACT_ID_TOWN_INFORMATION,
  OFFICIAL_CONTACT_ID_TOWN_SUPERINTENDENT,
} from '../site-cms-content';
import {
  LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  LEADERSHIP_ROSTER_GROUP_TOWN_ADMINISTRATION,
} from '../leadership-roster-group-ids';
import { SiteLanguageService } from '../site-language';

export type ContactLeadershipGroup = LeadershipGroup & { members: string[] };

export interface ParsedRosterLine {
  raw: string;
  role: string;
  name: string;
  href?: string;
  linkLabel?: string;
  detail?: string;
}

export function parseRosterLine(line: string): { role: string; name: string } {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    return { role: line.trim(), name: '' };
  }

  return {
    role: line.slice(0, colonIndex).trim(),
    name: line.slice(colonIndex + 1).trim(),
  };
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

function enrichAdminRosterLine(line: string, contacts: readonly CmsContact[]): ParsedRosterLine {
  const parsed = parseRosterLine(line);
  const contact = contactForAdminRole(parsed.role, contacts);

  return {
    raw: line,
    role: parsed.role,
    name: parsed.name,
    href: contact?.href,
    linkLabel:
      contact?.linkLabel ??
      (contact?.href?.startsWith('mailto:') ? contact.href.replace('mailto:', '') : undefined),
    detail: contact?.detail,
  };
}

@Component({
  selector: 'app-contact-page',
  imports: [CardModule, PanelModule, SkeletonModule],
  templateUrl: './contact-page.html',
  styleUrl: './contact-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage {
  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => APP_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly contacts = this.cmsStore.contacts;

  protected readonly leadershipGroups = computed<ContactLeadershipGroup[]>(() => {
    const base = this.copy().leadershipGroups;
    const cmsMap = this.cmsStore.leadershipRosterLinesByGroup();

    return base.map((group) => ({
      ...group,
      members: [...(cmsMap.get(group.groupId) ?? [])],
    }));
  });

  protected readonly townInformationContact = computed(() =>
    this.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_TOWN_INFORMATION),
  );

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

    return group.members.map((line) => enrichAdminRosterLine(line, this.contacts()));
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

    return group.members.map((line) => ({
      raw: line,
      ...parseRosterLine(line),
    }));
  });
}
