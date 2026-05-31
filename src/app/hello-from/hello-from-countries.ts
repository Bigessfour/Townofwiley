export interface HelloFromCountry {
  code: string;
  nameEn: string;
  nameEs: string;
  lat: number;
  lng: number;
}

/** Curated list for the public picker (centroid coordinates for map pins). */
export const HELLO_FROM_COUNTRIES: readonly HelloFromCountry[] = [
  { code: 'US', nameEn: 'United States', nameEs: 'Estados Unidos', lat: 39.8, lng: -98.6 },
  { code: 'CA', nameEn: 'Canada', nameEs: 'Canadá', lat: 56.1, lng: -106.3 },
  { code: 'MX', nameEn: 'Mexico', nameEs: 'México', lat: 23.6, lng: -102.5 },
  { code: 'IE', nameEn: 'Ireland', nameEs: 'Irlanda', lat: 53.4, lng: -7.7 },
  { code: 'GB', nameEn: 'United Kingdom', nameEs: 'Reino Unido', lat: 55.4, lng: -3.4 },
  { code: 'DE', nameEn: 'Germany', nameEs: 'Alemania', lat: 51.2, lng: 10.4 },
  { code: 'FR', nameEn: 'France', nameEs: 'Francia', lat: 46.2, lng: 2.2 },
  { code: 'ES', nameEn: 'Spain', nameEs: 'España', lat: 40.5, lng: -3.7 },
  { code: 'IT', nameEn: 'Italy', nameEs: 'Italia', lat: 41.9, lng: 12.6 },
  { code: 'NL', nameEn: 'Netherlands', nameEs: 'Países Bajos', lat: 52.1, lng: 5.3 },
  { code: 'SE', nameEn: 'Sweden', nameEs: 'Suecia', lat: 60.1, lng: 18.6 },
  { code: 'NO', nameEn: 'Norway', nameEs: 'Noruega', lat: 60.5, lng: 8.5 },
  { code: 'PL', nameEn: 'Poland', nameEs: 'Polonia', lat: 51.9, lng: 19.1 },
  { code: 'AU', nameEn: 'Australia', nameEs: 'Australia', lat: -25.3, lng: 133.8 },
  { code: 'NZ', nameEn: 'New Zealand', nameEs: 'Nueva Zelanda', lat: -40.9, lng: 174.9 },
  { code: 'JP', nameEn: 'Japan', nameEs: 'Japón', lat: 36.2, lng: 138.3 },
  { code: 'KR', nameEn: 'South Korea', nameEs: 'Corea del Sur', lat: 35.9, lng: 127.8 },
  { code: 'IN', nameEn: 'India', nameEs: 'India', lat: 20.6, lng: 78.9 },
  { code: 'BR', nameEn: 'Brazil', nameEs: 'Brasil', lat: -14.2, lng: -51.9 },
  { code: 'AR', nameEn: 'Argentina', nameEs: 'Argentina', lat: -38.4, lng: -63.6 },
  { code: 'ZA', nameEn: 'South Africa', nameEs: 'Sudáfrica', lat: -30.6, lng: 22.9 },
  { code: 'IL', nameEn: 'Israel', nameEs: 'Israel', lat: 31.0, lng: 34.9 },
  { code: 'PH', nameEn: 'Philippines', nameEs: 'Filipinas', lat: 12.9, lng: 121.8 },
] as const;

export function countryLabel(country: HelloFromCountry, locale: 'en' | 'es'): string {
  return locale === 'es' ? country.nameEs : country.nameEn;
}

export function findCountryByCode(code: string): HelloFromCountry | undefined {
  const normalized = code.trim().toUpperCase();
  return HELLO_FROM_COUNTRIES.find((entry) => entry.code === normalized);
}
