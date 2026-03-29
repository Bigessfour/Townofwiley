import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { LoggingService } from '../logging.service';

function getVerifiedWebsite(url?: string): string | undefined {
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
  name: string;
  phone: string;
  address: string;
  website?: string;
  description?: string;
  image?: string;
}

@Component({
  selector: 'app-business-directory',
  imports: [IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './business-directory.html',
  styleUrl: './business-directory.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessDirectory {
  protected readonly logging = inject(LoggingService);
  protected readonly directoryQuery = signal('');

  protected readonly businesses = signal<Business[]>([
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
      description: 'Family-owned general contracting specializing in metal buildings, trenching, and construction services.',
      image: 'https://static.wixstatic.com/media/8928bd_0cb13a43a9024243adc28739bb866030~mv2.png/v1/fill/w_264,h_222,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/8928bd_0cb13a43a9024243adc28739bb866030~mv2.png',
    },
    {
      name: 'Prairie Plumbing L.L.C.',
      phone: 'Contact via Facebook',
      address: 'Wiley, CO',
      website: getVerifiedWebsite('https://www.facebook.com/prairieplumbing/'),
      description: 'Plumbing services in Wiley, CO.',
    },
  ]);
  protected readonly filteredBusinesses = computed(() => {
    const query = this.directoryQuery().trim().toLowerCase();

    if (!query) {
      return this.businesses();
    }

    return this.businesses().filter((business) =>
      [business.name, business.address, business.description ?? '', business.phone, business.website ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  protected readonly title = 'Wiley Community Business Directory';

  protected updateDirectoryQuery(value: string): void {
    this.directoryQuery.set(value);
  }
}
