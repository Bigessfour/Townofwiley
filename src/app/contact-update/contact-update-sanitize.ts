import { sanitizePlainText } from '../input-sanitization';
import type { SiteLanguage } from '../site-language';
import type { ContactUpdateRequest } from './contact-update.service';

const MAX = {
  fullName: 160,
  serviceAddress: 240,
  poBox: 32,
  phone: 40,
  email: 254,
  notes: 1000,
} as const;

const LOCALES: readonly SiteLanguage[] = ['en', 'es'];
const SOURCE = 'payment-panel' as const;

function sanitizeLocale(value: string): SiteLanguage {
  const normalized = sanitizePlainText(value, 8).toLowerCase();
  return LOCALES.includes(normalized as SiteLanguage) ? (normalized as SiteLanguage) : 'en';
}

/**
 * Hardens resident contact-update payloads before HTTP POST or mailto fallback.
 */
export function sanitizeContactUpdateRequest(input: ContactUpdateRequest): ContactUpdateRequest {
  return {
    fullName: sanitizePlainText(input.fullName, MAX.fullName),
    serviceAddress: sanitizePlainText(input.serviceAddress, MAX.serviceAddress),
    poBox: sanitizePlainText(input.poBox, MAX.poBox),
    phone: sanitizePlainText(input.phone, MAX.phone),
    email: sanitizePlainText(input.email, MAX.email),
    notes: sanitizePlainText(input.notes, MAX.notes),
    locale: sanitizeLocale(input.locale),
    source: SOURCE,
  };
}
