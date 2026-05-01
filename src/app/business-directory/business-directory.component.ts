import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { SiteLanguageService } from '../site-language';

interface Business {
  name: string;
  category: string;
  location: string;
  rating: number;
  contact: string;
  lang: 'en' | 'es';
}

const STATIC_BUSINESSES: Business[] = [
  { name: 'Wiley General Store', category: 'Retail', location: 'Main St', rating: 4.5, contact: 'store@wiley.co', lang: 'en' },
  { name: 'Tienda General Wiley', category: 'Retail', location: 'Calle Principal', rating: 4.5, contact: 'tienda@wiley.co', lang: 'es' },
  { name: 'Wiley Auto Repair', category: 'Services', location: 'Oak Ave', rating: 4.2, contact: 'auto@wiley.co', lang: 'en' },
  { name: 'Reparación de Autos Wiley', category: 'Services', location: 'Ave Roble', rating: 4.2, contact: 'reparacion@wiley.co', lang: 'es' },
  // Add more static or load from CMS
];

@Component({
  selector: 'app-business-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './business-directory.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessDirectoryComponent {
  private langService = inject(SiteLanguageService);
  lang = computed(() => this.langService.currentLanguage() || 'en');
  searchTerm = signal('');
  selectedCategory = signal('');
  businesses = signal<Business[]>(STATIC_BUSINESSES);

  filteredBusinesses = computed(() => {
    let filtered = this.businesses();
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(b => 
        b.name.toLowerCase().includes(term) || 
        b.category.toLowerCase().includes(term) ||
        b.location.toLowerCase().includes(term)
      );
    }
    if (this.selectedCategory()) {
      filtered = filtered.filter(b => b.category === this.selectedCategory());
    }
    // Prefer matching language
    if (this.lang() === 'es') {
      filtered = filtered.filter(b => b.lang === 'es' || !b.lang).concat(filtered.filter(b => b.lang === 'en'));
    }
    return filtered;
  });

  searchChange = signal(0); // For debounce trigger

  constructor() {
    effect(() => {
      const sub = this.searchTerm.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
        // Refetch if CMS; here just filter
      });
      return () => sub.unsubscribe();
    });
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
  }

  onFilterChange(cat: string) {
    this.selectedCategory.set(cat);
  }

  // Future: loadBusinesses() { /* Apollo query */ }
}