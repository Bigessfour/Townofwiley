import { NgOptimizedImage } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { firstValueFrom } from 'rxjs';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { CMS_MODEL_DEFINITIONS, type CmsInventory, liveCountForModel } from './cms-model-inventory';

export interface CmsModelInventoryRow {
  model: string;
  routes: string;
  keyFields: string;
  publicRead: boolean;
  liveCount: number;
  awsCount: number | null;
  status: 'ok' | 'empty' | 'mismatch' | 'staff-only';
  warning?: string;
}

@Component({
  selector: 'app-cms-content-snapshot',
  standalone: true,
  imports: [NgOptimizedImage, CardModule, MessageModule, TableModule, TagModule],
  templateUrl: './cms-content-snapshot.component.html',
  styleUrl: './cms-content-snapshot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsContentSnapshotComponent {
  readonly cmsEditUrl = input.required<string>();
  /** Clerks use the task hub; IT sees the full table. */
  readonly audience = input<'clerk' | 'it'>('it');

  private readonly cmsStore = inject(LocalizedCmsContentStore);
  private readonly http = inject(HttpClient);

  protected readonly awsInventory = signal<CmsInventory | null>(null);

  protected readonly hero = computed(() => this.cmsStore.hero());
  protected readonly heroImageSrc = computed(
    () => this.hero().heroImageUrl?.trim() || '/hero-wiley.webp',
  );
  protected readonly heroUsesFallbackImage = computed(() => !this.hero().heroImageUrl?.trim());
  protected readonly isItAudience = computed(() => this.audience() === 'it');

  protected readonly liveCounts = computed(() => this.cmsStore.modelCounts());

  protected readonly inventoryRows = computed((): CmsModelInventoryRow[] => {
    const awsByModel = new Map(
      (this.awsInventory()?.models ?? []).map((m) => [m.model, m.itemCount]),
    );
    const live = this.liveCounts();

    return CMS_MODEL_DEFINITIONS.map((def) => {
      const awsCount = awsByModel.get(def.model) ?? null;
      const liveCount = liveCountForModel(def.model, live) ?? 0;
      const effectiveLive = def.model === 'EmailAlias' ? (awsCount ?? 0) : liveCount;

      let status: CmsModelInventoryRow['status'] = 'ok';
      if (!def.publicApiKeyRead) {
        status = 'staff-only';
      } else if (effectiveLive === 0 && (awsCount === 0 || awsCount === null)) {
        status = 'empty';
      } else if (awsCount !== null && awsCount !== effectiveLive && def.model !== 'SiteSettings') {
        status = 'mismatch';
      }

      return {
        model: def.model,
        routes: def.routes,
        keyFields: def.keyFields,
        publicRead: def.publicApiKeyRead,
        liveCount: effectiveLive,
        awsCount,
        status,
        warning: status === 'empty' ? def.emptyWarningEn : undefined,
      };
    });
  });

  constructor() {
    void this.loadAwsInventory();
  }

  protected statusSeverity(
    status: CmsModelInventoryRow['status'],
  ): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
    switch (status) {
      case 'ok':
        return 'success';
      case 'empty':
        return 'warn';
      case 'mismatch':
        return 'danger';
      default:
        return 'info';
    }
  }

  protected statusLabel(row: CmsModelInventoryRow): string {
    switch (row.status) {
      case 'empty':
        return 'Empty';
      case 'mismatch':
        return 'Review';
      case 'staff-only':
        return 'Staff only';
      default:
        return 'OK';
    }
  }

  private async loadAwsInventory(): Promise<void> {
    try {
      const inventory = await firstValueFrom(
        this.http.get<CmsInventory>('/cms-inventory.json', {
          headers: { 'Cache-Control': 'no-cache' },
        }),
      );
      this.awsInventory.set(inventory);
    } catch {
      this.awsInventory.set(null);
    }
  }
}
