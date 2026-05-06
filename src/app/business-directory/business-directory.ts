import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { LoggingService } from '../logging.service';
import { type CmsBusiness, LocalizedCmsContentStore } from '../site-cms-content';
import { type SiteLanguage, SiteLanguageService } from '../site-language';

interface BusinessDirectoryCopy {
  kicker: string;
  heading: string;
  intro: string;
  countSuffix: string;
  searchLabel: string;
  searchPlaceholder: string;
  metaLabel: string;
  phoneLabel: string;
  addressLabel: string;
  callLabel: string;
  visitWebsiteLabel: string;
  fallbackDescription: string;
  filteredEmptyPrefix: string;
  filteredEmptyClearLink: string;
  filteredEmptySuffix: string;
  loadingState: string;
  noBusinessesEmptyState: string;
}

const BUSINESS_DIRECTORY_COPY: Record<SiteLanguage, BusinessDirectoryCopy> = {
  en: {
    kicker: 'Wiley Business Directory',
    heading: 'Wiley Community Business Directory',
    intro:
      'Discover and support local Wiley businesses with direct contact details, addresses, and website links when they are available.',
    countSuffix: 'businesses',
    searchLabel: 'Search local businesses',
    searchPlaceholder: 'Search by business name, service, address, or phone',
    metaLabel: 'Wiley business',
    phoneLabel: 'Phone',
    addressLabel: 'Address',
    callLabel: 'Call',
    visitWebsiteLabel: 'Visit website',
    fallbackDescription: 'Local Wiley business listing.',
    filteredEmptyPrefix: 'No businesses match your search. Try a different word or ',
    filteredEmptyClearLink: 'clear the search',
    filteredEmptySuffix: '.',
    loadingState: 'Loading the Wiley business directory…',
    noBusinessesEmptyState:
      'No businesses are listed yet. To add or update a listing, contact Town Hall at (719) 829-4974.',
  },
  es: {
    kicker: 'Directorio de Negocios de Wiley',
    heading: 'Directorio Comunitario de Negocios de Wiley',
    intro:
      'Descubra y apoye a los negocios locales de Wiley con detalles de contacto, direcciones y enlaces a sitios web cuando esten disponibles.',
    countSuffix: 'negocios',
    searchLabel: 'Buscar negocios locales',
    searchPlaceholder: 'Buscar por nombre, servicio, direccion o telefono',
    metaLabel: 'Negocio de Wiley',
    phoneLabel: 'Telefono',
    addressLabel: 'Direccion',
    callLabel: 'Llamar',
    visitWebsiteLabel: 'Visitar sitio web',
    fallbackDescription: 'Negocio local de Wiley.',
    filteredEmptyPrefix: 'Ningun negocio coincide con su busqueda. Pruebe otra palabra o ',
    filteredEmptyClearLink: 'borre la busqueda',
    filteredEmptySuffix: '.',
    loadingState: 'Cargando el directorio de negocios de Wiley…',
    noBusinessesEmptyState:
      'Aun no hay negocios listados. Para agregar o actualizar una ficha, llame al Ayuntamiento al (719) 829-4974.',
  },
};

function getVerifiedWebsite(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'example.com' || hostname.endsWith('.example.com')) {
      return undefined;
    }

    return parsedUrl.toString();
  } catch {
    return undefined;
  }
}

interface Business {
  displayOrder?: number;
  name: string;
  phone: string;
  address: string;
  website?: string;
  description?: string;
  image?: string;
}

function normalizeBusinessKey(value: string): string {
  return value.trim().toLowerCase();
}

function compareBusinesses(left: Business, right: Business): number {
  const leftOrder = typeof left.displayOrder === 'number' ? left.displayOrder : Number.MAX_SAFE_INTEGER;
  const rightOrder = typeof right.displayOrder === 'number' ? right.displayOrder : Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return left.name.localeCompare(right.name);
}

function mapCmsBusiness(business: CmsBusiness): Business {
  return {
    displayOrder: business.displayOrder,
    name: business.name,
    phone: business.phone,
    address: business.address,
    website: getVerifiedWebsite(business.website),
    description: business.description,
    image: business.imageUrl,
  };
}

const FALLBACK_BUSINESSES: Business[] = [
  {
    name: 'Tempel Grain',
    phone: '719-829-4408',
    address: '100 Main Street, P.O. Box 36, Wiley, CO 81092',
    website: getVerifiedWebsite('https://www.tempelgrain.com/'),
    description: 'Grain elevator and agricultural services supporting local farmers.',
    image: 'https://www.tempelgrain.com/images/754/images/TempelGrainLogo_450.png',
  },
  {
    name: 'Colorado Bank & Trust - Wiley',
    phone: '719-829-4811',
    address: '220 Main Street, Wiley, CO 81092',
    website: getVerifiedWebsite('https://www.colobank.com/'),
    description: 'Hometown banking with exceptional customer service, mobile app, and remote deposit.',
  },
  {
    name: 'Los Hermanos Restaurant',
    phone: 'Contact via Facebook',
    address: 'Wiley, CO',
    website: getVerifiedWebsite('https://www.facebook.com/p/Los-Hermanos-Restaurant-61557700846895/'),
    description: 'Local restaurant in Wiley, CO.',
  },
  {
    name: 'County Line Convenience Store',
    phone: 'Contact via Facebook',
    address: 'Wiley, CO',
    website: getVerifiedWebsite('https://www.facebook.com/p/County-Line-Convenience-Store-100057178160741/'),
    description: 'Local convenience store in Wiley, CO.',
  },
  {
    name: 'May Valley Water Association',
    phone: '719-829-4571',
    address: '214 Main Street, Wiley, CO',
    website: getVerifiedWebsite('https://mayvalleywater.com/'),
    description: 'Water association providing service to the Wiley area.',
    image: 'https://mayvalleywater.com/img/logo1.png',
  },
  {
    name: 'Stampede Services',
    phone: '719-691-6129',
    address: '33527 Hwy 287, PO Box 311, Wiley, CO 81092',
    website: getVerifiedWebsite('https://www.stampedeservices.net/'),
    description:
      'Family-owned general contracting specializing in metal buildings, trenching, and construction services.',
    image: 'https://static.wixstatic.com/media/8928bd_0cb13a43a9024243adc28739bb866030~mv2.png/v1/fill/w_264,h_222,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/8928bd_0cb13a43a9024243adc28739bb866030~mv2.png',
  },
  {
    name: 'Prairie Plumbing L.L.C.',
    phone: 'Contact via Facebook',
    address: 'Wiley, CO',
    website: getVerifiedWebsite('https://www.facebook.com/prairieplumbing/'),
    description: 'Plumbing services in Wiley, CO.',
  },
];

@Component({
  selector: 'app-business-directory',
  imports: [IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './business-directory.html',
  styleUrl: './business-directory.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessDirectory {
  protected readonly logging = inject(LoggingService);
  private readonly cms = inject(LocalizedCmsContentStore);
  private readonly siteLanguageService = inject(SiteLanguageService);
  protected readonly directoryQuery = signal('');
  protected readonly failedLogoNames = signal<Set<string>>(new Set());

  protected readonly cmsLoading = this.cms.isLoading;
  protected readonly copy = computed(
    () => BUSINESS_DIRECTORY_COPY[this.siteLanguageService.currentLanguage() || 'en'],
  );

  protected readonly businesses = computed<Business[]>(() => {
    const cmsBusinesses = this.cms.businesses().map(mapCmsBusiness);
    const cmsBusinessKeys = new Set(cmsBusinesses.map((business) => normalizeBusinessKey(business.name)));
    const fallbackBusinesses = FALLBACK_BUSINESSES.map((business, index) => ({
      ...business,
      displayOrder: index + 1000,
    }));

    return [...cmsBusinesses, ...fallbackBusinesses.filter((business) => !cmsBusinessKeys.has(normalizeBusinessKey(business.name)))].sort(compareBusinesses);
  });

  protected readonly filteredBusinesses = computed(() => {
    const query = this.directoryQuery().trim().toLowerCase();

    if (!query) {
      return this.businesses();
    }

    return this.businesses().filter((business) =>
      [
        business.name,
        business.address,
        business.description ?? '',
        business.phone,
        business.website ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  protected readonly filteredBusinessCount = computed(() => this.filteredBusinesses().length);

  protected readonly hasAnyBusinesses = computed(() => this.businesses().length > 0);

  protected readonly hasActiveSearch = computed(() => this.directoryQuery().trim().length > 0);

  protected updateDirectoryQuery(value: string): void {
    this.directoryQuery.set(value);
  }

  protected markLogoFailed(name: string): void {
    this.failedLogoNames.update((current) => {
      const next = new Set(current);
      next.add(normalizeBusinessKey(name));
      return next;
    });
  }

  protected hasLogoFailed(name: string): boolean {
    return this.failedLogoNames().has(normalizeBusinessKey(name));
  }

  protected getLogoFallbackText(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected getMapsUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  protected getPhoneHref(phone: string): string | null {
    const normalizedPhone = phone.replace(/[^\d+]/g, '');

    return normalizedPhone ? `tel:${normalizedPhone}` : null;
  }
}
