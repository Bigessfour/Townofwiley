import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { APP_COPY, type LeadershipGroup } from '../app';
import { LocalizedCmsContentStore, OFFICIAL_CONTACT_ID_CITY_CLERK } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

interface ContactRecordsAssistanceCopy {
  heading: string;
  body: string;
  emailLabel: string;
  fallbackEmail: string;
}

const CONTACT_RECORDS_ASSISTANCE_COPY: Record<'en' | 'es', ContactRecordsAssistanceCopy> = {
  en: {
    heading: 'Records, permits, and document requests',
    body: 'The Town Clerk can help with public records, permits, licenses, and other document requests.',
    emailLabel: 'Email the Town Clerk',
    fallbackEmail: 'clerk@townofwiley.gov',
  },
  es: {
    heading: 'Registros, permisos y solicitudes de documentos',
    body: 'La secretaria del pueblo puede ayudar con registros publicos, permisos, licencias y otras solicitudes.',
    emailLabel: 'Escribir a la secretaria del pueblo',
    fallbackEmail: 'clerk@townofwiley.gov',
  },
};

@Component({
  selector: 'app-contact-page',
  imports: [CardModule, DividerModule, SkeletonModule],
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
  protected readonly recordsAssistanceCopy = computed(
    () => CONTACT_RECORDS_ASSISTANCE_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );
  protected readonly cmsLoading = this.cmsStore.isLoading;
  protected readonly contacts = this.cmsStore.contacts;
  protected readonly clerkEmailHref = computed(() => {
    const clerk = this.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_CITY_CLERK);
    if (clerk?.href?.startsWith('mailto:')) {
      return clerk.href;
    }

    return `mailto:${CONTACT_RECORDS_ASSISTANCE_COPY.en.fallbackEmail}`;
  });
  protected readonly clerkEmailLabel = computed(() => {
    const clerk = this.contacts().find((contact) => contact.id === OFFICIAL_CONTACT_ID_CITY_CLERK);
    return clerk?.value ?? this.recordsAssistanceCopy().fallbackEmail;
  });
  protected readonly leadershipGroups = computed<LeadershipGroup[]>(() => {
    const base = this.copy().leadershipGroups;
    const cmsMap = this.cmsStore.leadershipRosterLinesByGroup();

    if (cmsMap.size === 0) {
      return base;
    }

    return base.map((group) => {
      const cmsLines = cmsMap.get(group.groupId);

      if (cmsLines?.length) {
        return { ...group, members: [...cmsLines] };
      }

      return group;
    });
  });
}
