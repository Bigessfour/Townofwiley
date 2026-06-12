import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DocumentUploadService } from '../document-upload.service';
import { localizeCmsPublicDocument } from '../meeting-documents/localize-public-document';
import { cmsDocumentHubFragment } from '../public-document-event-link';
import { LocalizedCmsContentStore } from '../site-cms-content';
import { SiteLanguage, SiteLanguageService } from '../site-language';

interface MeetingDocumentsArchiveCopy {
  kicker: string;
  heading: string;
  searchPlaceholder: string;
  searchAriaLabel: string;
  openDocumentLabel: string;
  downloadDocumentLabel: string;
  updatedLabel: string;
  formatLabel: string;
  loadMoreLabel: string;
  resolutionErrorMessage: string;
  emptyState: string;
}

const ARCHIVE_COPY: Record<SiteLanguage, MeetingDocumentsArchiveCopy> = {
  en: {
    kicker: 'Meeting documents',
    heading: 'Search agendas and approved minutes',
    searchPlaceholder: 'Search agendas, minutes, or keywords...',
    searchAriaLabel: 'Search agendas, minutes, or keywords',
    openDocumentLabel: 'Open document',
    downloadDocumentLabel: 'Download file',
    updatedLabel: 'Updated',
    formatLabel: 'Format',
    loadMoreLabel: 'Load more documents',
    resolutionErrorMessage:
      'Some document links could not be loaded. Refresh the page or email clerk@townofwiley.gov if the problem persists.',
    emptyState: 'No meeting documents are posted yet. Email clerk@townofwiley.gov for assistance.',
  },
  es: {
    kicker: 'Documentos de reuniones',
    heading: 'Buscar agendas y minutas aprobadas',
    searchPlaceholder: 'Buscar agendas, minutas o palabras clave...',
    searchAriaLabel: 'Buscar agendas, minutas o palabras clave',
    openDocumentLabel: 'Abrir documento',
    downloadDocumentLabel: 'Descargar archivo',
    updatedLabel: 'Actualizado',
    formatLabel: 'Formato',
    loadMoreLabel: 'Cargar mas documentos',
    resolutionErrorMessage:
      'Algunos enlaces no se pudieron cargar. Actualice la pagina o escriba a clerk@townofwiley.gov si el problema continua.',
    emptyState:
      'Todavia no hay documentos de reuniones publicados. Escriba a clerk@townofwiley.gov para obtener ayuda.',
  },
};

@Component({
  selector: 'app-meeting-documents-archive',
  imports: [ButtonModule, InputTextModule],
  templateUrl: './meeting-documents-archive.component.html',
  styleUrl: './meeting-documents-archive.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingDocumentsArchiveComponent {
  private static readonly PAGE_SIZE = 12;

  private readonly cms = inject(LocalizedCmsContentStore);
  private readonly documentUploadService = inject(DocumentUploadService);
  private readonly siteLanguageService = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => ARCHIVE_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly searchTerm = signal('');
  protected readonly resolvedHrefs = signal<Record<string, string>>({});
  protected readonly hrefResolutionError = signal(false);
  protected readonly displayLimit = signal(MeetingDocumentsArchiveComponent.PAGE_SIZE);

  private readonly publishedDocuments = computed(() => {
    const language = this.siteLanguageService.currentLanguage();
    return this.cms
      .publicDocuments()
      .map((doc) => localizeCmsPublicDocument(doc, language))
      .map((doc) => ({
        ...doc,
        href: this.resolvedHrefs()[doc.id] ?? doc.href,
      }));
  });

  protected readonly filteredDocuments = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const documents = this.publishedDocuments();

    if (!term) {
      return documents;
    }

    return documents.filter(
      (document) =>
        document.title.toLowerCase().includes(term) ||
        document.summary.toLowerCase().includes(term) ||
        document.keywords.some((keyword) => keyword.toLowerCase().includes(term)),
    );
  });

  protected readonly visibleDocuments = computed(() =>
    this.filteredDocuments().slice(0, this.displayLimit()),
  );

  protected readonly hasMoreDocuments = computed(
    () => this.filteredDocuments().length > this.displayLimit(),
  );

  constructor() {
    effect(() => {
      this.searchTerm();
      this.siteLanguageService.currentLanguage();
      this.displayLimit.set(MeetingDocumentsArchiveComponent.PAGE_SIZE);
    });

    effect(() => {
      const documents = this.cms.publicDocuments();
      void this.resolveDocumentHrefs(documents.map((document) => [document.id, document.href]));
    });

    if (typeof window !== 'undefined') {
      const fragment = window.location.hash.replace(/^#/, '');
      if (fragment.startsWith('cms-doc-')) {
        queueMicrotask(() => this.scrollToFragment(fragment));
      }
    }
  }

  protected documentFragmentId(documentId: string): string {
    return cmsDocumentHubFragment(documentId);
  }

  protected loadMore(): void {
    this.displayLimit.update((count) => count + MeetingDocumentsArchiveComponent.PAGE_SIZE);
  }

  private async resolveDocumentHrefs(
    entries: readonly (readonly [string, string])[],
  ): Promise<void> {
    if (entries.length === 0) {
      this.resolvedHrefs.set({});
      this.hrefResolutionError.set(false);
      return;
    }

    try {
      const resolvedEntries = await Promise.all(
        entries.map(async ([id, href]) => {
          const resolvedHref = await this.documentUploadService.resolveDocumentHref(href);
          return [id, resolvedHref] as const;
        }),
      );
      this.resolvedHrefs.set(Object.fromEntries(resolvedEntries));
      this.hrefResolutionError.set(false);
    } catch (error) {
      console.error('Failed to resolve meeting document links:', error);
      this.resolvedHrefs.set({});
      this.hrefResolutionError.set(true);
    }
  }

  private scrollToFragment(fragment: string): void {
    const documents = this.filteredDocuments();
    const targetIndex = documents.findIndex(
      (entry) => cmsDocumentHubFragment(entry.id) === fragment,
    );

    if (targetIndex >= 0 && targetIndex >= this.displayLimit()) {
      this.displayLimit.set(targetIndex + 1);
    }

    requestAnimationFrame(() => {
      document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}
