import { expect, Locator, Page } from '@playwright/test';

/** Matches EN/ES `aria-label` on language toggle buttons in either locale. */
export const SITE_LANGUAGE_GROUP = /^(Site language|Idioma del sitio)$/i;

export const SITE_LANGUAGE_BUTTON = {
  en: /^(Site language|Idioma del sitio): EN$/i,
  es: /^(Site language|Idioma del sitio): ES$/i,
} as const;

export function siteLanguageGroup(scope: Page | Locator): Locator {
  return scope.getByRole('group', { name: SITE_LANGUAGE_GROUP });
}

export function siteLanguageButton(scope: Page | Locator, language: 'en' | 'es'): Locator {
  const name = language === 'es' ? SITE_LANGUAGE_BUTTON.es : SITE_LANGUAGE_BUTTON.en;
  return siteLanguageGroup(scope).getByRole('button', { name });
}

/** Clicks the visible language toggle (megamenu on desktop, compact header on mobile). */
export async function clickVisibleSiteLanguage(page: Page, language: 'en' | 'es'): Promise<void> {
  const button = page
    .getByRole('button', {
      name: language === 'es' ? SITE_LANGUAGE_BUTTON.es : SITE_LANGUAGE_BUTTON.en,
    })
    .locator('visible=true')
    .first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}
