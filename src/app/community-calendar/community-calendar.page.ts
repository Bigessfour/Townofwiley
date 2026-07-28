import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { SiteLanguageService } from '../site-language';
import {
  createGoogleCalendarLinkForCommunityEvent,
  createIcsDataUrlForCommunityEvent,
} from './community-calendar-links';
import { COMMUNITY_CALENDAR_COPY } from './community-calendar.copy';
import { CommunityCalendarService } from './community-calendar.service';
import {
  COMMUNITY_CATEGORY_ICONS,
  COMMUNITY_EVENT_CATEGORIES,
  type CommunityEvent,
  type CommunityEventCategory,
} from './community-calendar.types';

@Component({
  selector: 'app-community-calendar-panel',
  imports: [
    ButtonModule,
    DatePipe,
    FormsModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectModule,
    TextareaModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './community-calendar.page.html',
  styleUrl: './community-calendar.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityCalendarPanel implements OnInit {
  private readonly siteLanguage = inject(SiteLanguageService);
  private readonly calendarService = inject(CommunityCalendarService);
  private readonly messages = inject(MessageService);

  /** Emits public community events whenever the panel reloads them. */
  readonly eventsChange = output<CommunityEvent[]>();

  protected readonly copy = computed(
    () => COMMUNITY_CALENDAR_COPY[this.siteLanguage.currentLanguage() || 'en'],
  );
  protected readonly events = signal<CommunityEvent[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadError = signal(false);
  protected readonly submitting = signal(false);
  protected readonly selectedCategory = signal<CommunityEventCategory | ''>('');
  protected readonly categoryIcons = COMMUNITY_CATEGORY_ICONS;

  protected readonly categoryOptions = computed(() => {
    const labels = this.copy().categoryLabels;
    return COMMUNITY_EVENT_CATEGORIES.map((id) => ({
      label: labels[id],
      value: id,
      icon: COMMUNITY_CATEGORY_ICONS[id],
    }));
  });

  protected readonly filterOptions = computed(() => [
    { label: this.copy().filterAllLabel, value: '' as const },
    ...this.categoryOptions(),
  ]);

  protected readonly filteredEvents = computed(() => {
    const category = this.selectedCategory();
    const items = this.events();
    return category ? items.filter((item) => item.category === category) : items;
  });

  protected readonly submitForm = new FormGroup({
    submitterName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    submitterPhone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    submitterEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    location: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    startDateTime: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDateTime: new FormControl('', { nonNullable: true }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    category: new FormControl<CommunityEventCategory>('other', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    organizerName: new FormControl('', { nonNullable: true }),
    socialLink: new FormControl('', { nonNullable: true }),
    audience: new FormControl('', { nonNullable: true }),
    cost: new FormControl('', { nonNullable: true }),
    accessibilityNotes: new FormControl('', { nonNullable: true }),
    website: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.reloadEvents();
  }

  protected reloadEvents(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.calendarService.listEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.eventsChange.emit(events);
        this.loading.set(false);
      },
      error: () => {
        // Bundled seeds still available via service catchError; treat hard failures as empty.
        this.events.set([]);
        this.eventsChange.emit([]);
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  protected onCategoryFilter(value: CommunityEventCategory | '' | null): void {
    this.selectedCategory.set(value ?? '');
  }

  protected googleHref(event: CommunityEvent): string {
    return createGoogleCalendarLinkForCommunityEvent(event);
  }

  protected icsHref(event: CommunityEvent): string {
    return createIcsDataUrlForCommunityEvent(event);
  }

  protected categoryLabel(category: CommunityEventCategory): string {
    return this.copy().categoryLabels[category];
  }

  protected submitEvent(): void {
    if (this.submitForm.invalid) {
      this.submitForm.markAllAsTouched();
      return;
    }

    const copy = this.copy();
    if (!this.calendarService.isConfigured()) {
      this.messages.add({
        severity: 'warn',
        summary: copy.submitErrorSummary,
        detail: copy.submitUnavailableDetail,
        life: 8000,
      });
      return;
    }

    const value = this.submitForm.getRawValue();
    this.submitting.set(true);
    this.calendarService
      .submitEvent({
        ...value,
        startDateTime: toIsoFromLocalInput(value.startDateTime),
        endDateTime: value.endDateTime ? toIsoFromLocalInput(value.endDateTime) : undefined,
        language: this.siteLanguage.currentLanguage() === 'es' ? 'es' : 'en',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitForm.reset({
            category: 'other',
            submitterName: '',
            submitterPhone: '',
            submitterEmail: '',
            location: '',
            title: '',
            startDateTime: '',
            endDateTime: '',
            description: '',
            organizerName: '',
            socialLink: '',
            audience: '',
            cost: '',
            accessibilityNotes: '',
            website: '',
          });
          this.messages.add({
            severity: 'success',
            summary: copy.submitSuccessSummary,
            detail: copy.submitSuccessDetail,
            life: 7000,
          });
        },
        error: (error: unknown) => {
          this.submitting.set(false);
          const detail =
            error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
              ? error.error.error
              : copy.submitUnavailableDetail;
          this.messages.add({
            severity: 'error',
            summary: copy.submitErrorSummary,
            detail,
            life: 8000,
          });
        },
      });
  }
}

/** @deprecated Use CommunityCalendarPanel — kept for any lazy-route leftovers. */
export { CommunityCalendarPanel as CommunityCalendarPage };

function toIsoFromLocalInput(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString();
}
