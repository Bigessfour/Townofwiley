import { expect, Locator, Page } from '@playwright/test';
import {
  SITE_LANGUAGE_GROUP,
  clickVisibleSiteLanguage,
  siteLanguageButton,
} from '../support/site-language-toggle';

/** Shared header, search, language, mobile menu, and footer chrome. */
export class SiteChromePage {
  readonly page: Page;
  readonly skipLink: Locator;
  readonly mainContent: Locator;
  readonly mobileMenuButton: Locator;
  readonly sectionNav: Locator;
  readonly sectionNavLinks: Locator;
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  readonly emptySearchState: Locator;
  readonly footerLinks: Locator;
  readonly townLogo: Locator;
  readonly languageGroup: Locator;
  readonly mobileMenuDrawer: Locator;
  readonly taskCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
    this.mainContent = page.locator('#main-content');
    this.mobileMenuButton = page.locator('button.mobile-menu-button');
    this.sectionNav = page.getByTestId('homepage-section-nav');
    this.sectionNavLinks = page.locator(
      '[data-testid="homepage-section-nav"] .mega-menu-root-link',
    );
    this.searchInput = this.sectionNav.locator('#mega-site-search');
    this.searchResults = page.locator('.search-result');
    this.emptySearchState = page.locator('.empty-state');
    this.footerLinks = page.locator('.footer-links a');
    this.townLogo = page.locator('.site-header a.town-logo').filter({ visible: true }).first();
    this.languageGroup = page.getByRole('group', { name: SITE_LANGUAGE_GROUP });
    this.mobileMenuDrawer = page.locator('#mobile-menu-drawer');
    this.taskCards = page.locator('.task-card');
  }

  async activateSkipToMain(): Promise<void> {
    await expect(this.skipLink).toHaveAttribute('href', '#main-content');
    await this.skipLink.focus();
    await expect(this.skipLink).toBeFocused();
    await this.page.keyboard.press('Enter');
    await expect(this.page).toHaveURL(/#main-content/);
    await expect(this.mainContent).toBeVisible();
  }

  async clickLogoExpectHome(): Promise<void> {
    const megamenuLogo = this.sectionNav.getByRole('link', { name: /Return to homepage/i });
    if (await megamenuLogo.isVisible().catch(() => false)) {
      await megamenuLogo.click();
    } else {
      await this.townLogo.click();
    }
    await expect(this.page).toHaveURL(/\/(\?.*)?$/);
  }

  async switchLanguage(language: 'en' | 'es'): Promise<void> {
    const megamenuButton = siteLanguageButton(this.sectionNav, language);
    if (await megamenuButton.isVisible().catch(() => false)) {
      await megamenuButton.click();
    } else {
      await clickVisibleSiteLanguage(this.page, language);
      return;
    }
    await expect(this.page.locator('html')).toHaveAttribute('lang', language);
  }

  async submitSiteSearch(query: string): Promise<void> {
    await this.setMegaSiteSearchDraft(query);
    await expect(this.searchInput).toHaveValue(query);
    await this.page.waitForSelector('.search-result, .empty-state', { timeout: 15_000 });
  }

  async openMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    await expect(this.mobileMenuDrawer.locator('.mobile-menu-nav')).toBeVisible();
  }

  async clickMegaMenuRoot(label: string): Promise<void> {
    await this.sectionNavLinks
      .filter({ hasText: label })
      .first()
      .click({ position: { x: 5, y: 5 } });
  }

  async clickFooterLink(href: string): Promise<void> {
    await this.footerLinks.filter({ href }).first().click();
  }

  private async setMegaSiteSearchDraft(query: string): Promise<void> {
    await this.searchInput.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => undefined);
    await this.searchInput.evaluate((el, q) => {
      const input = el as HTMLInputElement;
      try {
        input.focus();
      } catch {
        /* Hidden megamenu controls may reject focus on narrow viewports. */
      }
      input.value = q;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, data: q }));
    }, query);
  }
}
