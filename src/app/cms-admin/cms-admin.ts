import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CmsAlertBanner,
  CmsContact,
  CmsContentStore,
  CmsHeroContent,
  CmsNotice,
  DEFAULT_CMS_ALERT_BANNER,
  DEFAULT_CMS_CONTACTS,
  DEFAULT_CMS_HERO,
  DEFAULT_CMS_NOTICES,
  cloneCmsAlertBanner,
  cloneCmsContacts,
  cloneCmsHeroContent,
  cloneCmsNotices,
  createCmsContactId,
  createCmsNoticeId,
} from '../cms-content';

@Component({
  selector: 'app-cms-admin',
  imports: [FormsModule],
  templateUrl: './cms-admin.html',
  styleUrl: './cms-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsAdmin {
  private readonly cmsStore = inject(CmsContentStore);

  protected readonly hero = signal<CmsHeroContent>(this.cmsStore.getDraftContent().hero);
  protected readonly alertBanner = signal<CmsAlertBanner>(
    this.cmsStore.getDraftContent().alertBanner,
  );
  protected readonly contacts = signal<CmsContact[]>(this.cmsStore.getDraftContent().contacts);
  protected readonly notices = signal<CmsNotice[]>(this.cmsStore.getDraftContent().notices);
  protected readonly persistenceSummary = this.cmsStore.persistenceSummary;
  protected readonly statusMessage = signal<string | null>(null);
  protected readonly hasUnsavedChanges = computed(
    () => JSON.stringify(this.getDraftContent()) !== JSON.stringify(this.cmsStore.getDraftContent()),
  );
  protected readonly noticeCount = computed(() => this.notices().length);
  protected readonly contactCount = computed(() => this.contacts().length);
  protected readonly alertStatusLabel = computed(() =>
    this.alertBanner().enabled ? 'Banner will show on the homepage' : 'Banner is hidden',
  );

  protected updateHero<K extends keyof CmsHeroContent>(field: K, value: CmsHeroContent[K]): void {
    this.hero.update((hero) => ({ ...hero, [field]: value }));
    this.statusMessage.set(null);
  }

  protected updateAlertBanner<K extends keyof CmsAlertBanner>(
    field: K,
    value: CmsAlertBanner[K],
  ): void {
    this.alertBanner.update((alertBanner) => ({ ...alertBanner, [field]: value }));
    this.statusMessage.set(null);
  }

  protected addNotice(): void {
    this.notices.update((items) => [
      {
        id: createCmsNoticeId(),
        title: 'New town notice',
        date: 'Add publish window',
        detail: 'Replace this draft with the clerk-approved notice text.',
      },
      ...items,
    ]);
    this.statusMessage.set(null);
  }

  protected updateNotice<K extends keyof CmsNotice>(
    noticeId: string,
    field: K,
    value: CmsNotice[K],
  ): void {
    this.notices.update((items) =>
      items.map((notice) => (notice.id === noticeId ? { ...notice, [field]: value } : notice)),
    );
    this.statusMessage.set(null);
  }

  protected removeNotice(id: string): void {
    this.notices.update((items) => items.filter((notice) => notice.id !== id));
    this.statusMessage.set(null);
  }

  protected addContact(): void {
    this.contacts.update((items) => [
      ...items,
      {
        id: createCmsContactId(),
        label: 'New contact',
        value: 'Add a name, phone, or email',
        detail: 'Explain when residents should use this contact.',
        href: '',
        linkLabel: '',
      },
    ]);
    this.statusMessage.set(null);
  }

  protected updateContact<K extends keyof CmsContact>(
    contactId: string,
    field: K,
    value: CmsContact[K],
  ): void {
    this.contacts.update((items) =>
      items.map((contact) =>
        contact.id === contactId ? { ...contact, [field]: value } : contact,
      ),
    );
    this.statusMessage.set(null);
  }

  protected removeContact(contactId: string): void {
    this.contacts.update((items) => items.filter((contact) => contact.id !== contactId));
    this.statusMessage.set(null);
  }

  protected async saveChanges(): Promise<void> {
    await this.cmsStore.saveContent(this.getDraftContent());
    this.loadDraftFromStore();
    this.statusMessage.set(
      'Saved. Homepage text, banner, contacts, and notices now reflect this clerk draft in the current browser.',
    );
  }

  protected discardChanges(): void {
    this.loadDraftFromStore();
    this.statusMessage.set('Draft reset to the currently saved homepage content.');
  }

  protected restoreStarterContent(): void {
    this.hero.set(cloneCmsHeroContent(DEFAULT_CMS_HERO));
    this.alertBanner.set(cloneCmsAlertBanner(DEFAULT_CMS_ALERT_BANNER));
    this.notices.set(cloneCmsNotices(DEFAULT_CMS_NOTICES));
    this.contacts.set(cloneCmsContacts(DEFAULT_CMS_CONTACTS));
    this.statusMessage.set(
      'Starter homepage content restored in the editor. Save to publish it into this browser.',
    );
  }

  private loadDraftFromStore(): void {
    const draft = this.cmsStore.getDraftContent();

    this.hero.set(draft.hero);
    this.alertBanner.set(draft.alertBanner);
    this.notices.set(draft.notices);
    this.contacts.set(draft.contacts);
  }

  private getDraftContent() {
    return {
      hero: this.hero(),
      alertBanner: this.alertBanner(),
      notices: this.notices(),
      contacts: this.contacts(),
    };
  }
}
