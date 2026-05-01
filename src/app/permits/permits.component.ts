import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguageService } from '../site-language';

@Component({
  selector: 'app-permits',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './permits.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermitsComponent {
  private cmsStore = inject(LocalizedCmsContentStore);
  private langService = inject(SiteLanguageService);

  lang = computed(() => this.langService.currentLanguage() || 'en');
  contacts = computed(() => this.cmsStore.contacts());
  clerkContact = computed(() => this.contacts().find(c => c.id === 'city-clerk'));
  clerkEmail = computed(() => this.clerkContact()?.href?.replace('mailto:', ''));
  townPhone = computed(() => this.contacts().find(c => c.id === 'town-information')?.href?.replace('tel:', ''));
}