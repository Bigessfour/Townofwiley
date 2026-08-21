import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { ContactPageSection } from './cms-clerk-record-editor-options';
import { CmsClerkRecordEditorComponent } from './cms-clerk-record-editor.component';
import { CONTACT_PAGE_SECTIONS } from './cms-contact-page-sections';

@Component({
  selector: 'app-cms-contact-page-chooser',
  standalone: true,
  imports: [ButtonModule, CmsClerkRecordEditorComponent],
  templateUrl: './cms-contact-page-chooser.component.html',
  styleUrl: './cms-contact-page-chooser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsContactPageChooserComponent {
  protected readonly sections = CONTACT_PAGE_SECTIONS;
  protected readonly selected = signal<ContactPageSection | null>(null);

  protected selectSection(section: ContactPageSection): void {
    this.selected.set(section);
  }

  protected backToParts(): void {
    this.selected.set(null);
  }
}
