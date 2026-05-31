import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { SiteLanguageService } from '../site-language';
import { getGuestbookRuntimeConfig } from './hello-from-config';
import { HELLO_FROM_COPY } from './hello-from-copy';
import {
  countryLabel,
  findCountryByCode,
  HELLO_FROM_COUNTRIES,
  type HelloFromCountry,
} from './hello-from-countries';
import { HelloFromService, type HelloFromMessage } from './hello-from.service';

@Component({
  selector: 'app-hello-from-page',
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './hello-from-page.html',
  styleUrl: './hello-from-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelloFromPage implements OnInit {
  private readonly helloFrom = inject(HelloFromService);
  private readonly siteLanguage = inject(SiteLanguageService);

  protected readonly copy = computed(
    () => HELLO_FROM_COPY[this.siteLanguage.currentLanguage() || 'en'],
  );
  protected readonly locale = computed(() => this.siteLanguage.currentLanguage() || 'en');
  protected readonly isConfigured = Boolean(getGuestbookRuntimeConfig().apiEndpoint);

  protected readonly countries = computed(() =>
    HELLO_FROM_COUNTRIES.map((country) => ({
      ...country,
      label: countryLabel(country, this.locale() === 'es' ? 'es' : 'en'),
    })),
  );

  protected readonly messages = signal<HelloFromMessage[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal(false);

  protected selectedCountryCode = signal('');
  protected displayName = signal('');
  protected message = signal('');
  protected publicConsent = signal(false);
  /** Honeypot — must stay empty. */
  protected website = signal('');

  ngOnInit(): void {
    void this.bootstrap();
  }

  protected countryOptions(): { label: string; value: string }[] {
    return this.countries().map((c) => ({ label: c.label, value: c.code }));
  }

  protected selectedCountry(): HelloFromCountry | undefined {
    return findCountryByCode(this.selectedCountryCode());
  }

  protected formatLocation(row: HelloFromMessage): string {
    return row.placeLabel || row.countryCode;
  }

  protected displayNameFor(row: HelloFromMessage): string {
    const name = row.displayName?.trim();
    return name && name !== 'Anonymous' ? name : this.copy().anonymous;
  }

  protected mapLink(row: HelloFromMessage): string {
    return this.helloFrom.openOsmMap(row.lat, row.lng);
  }

  protected async submit(): Promise<void> {
    if (this.website().trim()) {
      return;
    }
    const country = this.selectedCountry();
    if (!country) {
      this.submitError.set(this.copy().countryPlaceholder);
      return;
    }
    this.submitting.set(true);
    this.submitError.set(null);
    this.submitSuccess.set(false);

    const result = await this.helloFrom.submitMessage({
      message: this.message(),
      displayName: this.displayName(),
      placeLabel: countryLabel(country, this.locale() === 'es' ? 'es' : 'en'),
      countryCode: country.code,
      lat: country.lat,
      lng: country.lng,
      locale: this.locale() === 'es' ? 'es' : 'en',
      publicConsent: this.publicConsent(),
    });

    this.submitting.set(false);
    if (!result.ok) {
      this.submitError.set(result.error);
      return;
    }
    this.submitSuccess.set(true);
    this.message.set('');
    this.displayName.set('');
    this.publicConsent.set(false);
    await this.reloadMessages();
  }

  private async bootstrap(): Promise<void> {
    await this.helloFrom.recordPageVisit('/hello-from', this.locale() === 'es' ? 'es' : 'en');
    await this.reloadMessages();
  }

  private async reloadMessages(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    const result = await this.helloFrom.loadPublishedMessages();
    if (result.ok) {
      this.messages.set(result.data);
    } else {
      this.messages.set([]);
      this.loadError.set(result.error);
    }
    this.loading.set(false);
  }
}
