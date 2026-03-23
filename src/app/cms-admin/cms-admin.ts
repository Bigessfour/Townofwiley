import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CmsContentStore } from '../cms-content';

@Component({
  selector: 'app-cms-admin',
  templateUrl: './cms-admin.html',
  styleUrl: './cms-admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsAdmin {
  private readonly cmsStore = inject(CmsContentStore);

  protected readonly persistenceSummary = this.cmsStore.persistenceSummary;
  protected readonly isLoading = this.cmsStore.isLoading;
  protected readonly loadError = this.cmsStore.loadError;
  protected readonly heroTitle = computed(() => this.cmsStore.hero().title);
  protected readonly heroMessage = computed(() => this.cmsStore.hero().message);
  protected readonly noticeCount = computed(() => this.cmsStore.notices().length);
  protected readonly contactCount = computed(() => this.cmsStore.contacts().length);
  protected readonly alertStatusLabel = computed(() =>
    this.cmsStore.alertBanner().enabled
      ? 'Banner is enabled in Amplify Studio'
      : 'Banner is hidden in Amplify Studio',
  );
  protected readonly studioUrl =
    'https://us-east-2.console.aws.amazon.com/amplify/home?region=us-east-2#/d331voxr1fhoir';
}
