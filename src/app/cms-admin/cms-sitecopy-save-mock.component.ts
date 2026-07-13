import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { siteCopyAppearsOn } from '../site-copy-overrides';

/** Phase 2: contextual mock of SiteCopy text (not a live-site preview — Phase 3 deferred). */
@Component({
  selector: 'app-cms-sitecopy-save-mock',
  standalone: true,
  templateUrl: './cms-sitecopy-save-mock.component.html',
  styleUrl: './cms-sitecopy-save-mock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsSitecopySaveMockComponent {
  readonly formValues = input.required<Record<string, string | boolean>>();

  protected readonly key = computed(() => String(this.formValues()['key'] ?? '').trim());
  protected readonly valueEn = computed(() => String(this.formValues()['valueEn'] ?? '').trim());
  protected readonly valueEs = computed(() => String(this.formValues()['valueEs'] ?? '').trim());
  protected readonly appearsOn = computed(() => siteCopyAppearsOn(this.key()));

  protected readonly showTownHallCard = computed(() =>
    ['contactTownHallTitle', 'contactTownHallAddress', 'contactTownHallPhone', 'contactTownHallHours'].includes(
      this.key(),
    ),
  );

  protected readonly showQuickTasks = computed(() =>
    ['topTasksKicker', 'topTasksHeading'].includes(this.key()),
  );

  protected readonly hasContent = computed(
    () => Boolean(this.key()) && Boolean(this.valueEn() || this.valueEs()),
  );
}