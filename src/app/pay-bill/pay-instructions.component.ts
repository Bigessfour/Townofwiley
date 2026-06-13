import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { payInstructionsCopy } from './pay-instructions-copy';

@Component({
  selector: 'app-pay-instructions',
  standalone: true,
  imports: [CardModule],
  templateUrl: './pay-instructions.component.html',
  styleUrl: './pay-instructions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayInstructionsComponent {
  readonly lang = input.required<'en' | 'es'>();

  protected readonly copy = computed(() => payInstructionsCopy(this.lang()));
}
