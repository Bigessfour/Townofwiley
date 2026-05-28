import { expect, Locator, Page } from '@playwright/test';

/** Shared header, search, language, mobile menu, chatbot, and footer chrome. */
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
  readonly floatingChatButton: Locator;
  readonly assistantDialog: Locator;
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
    this.townLogo = page.locator('a.town-logo');
    this.languageGroup = page.getByRole('group', { name: 'Site language' });
    this.floatingChatButton = page.getByRole('button', { name: /Open Ask Wiley/i });
    this.assistantDialog = page.getByRole('dialog', { name: /Ask Wiley.*Town Assistant/ });
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
    await this.townLogo.click();
    await expect(this.page).toHaveURL(/\/(\?.*)?$/);
  }

  async switchLanguage(language: 'en' | 'es'): Promise<void> {
    const selector = language === 'es' ? '#site-language-es' : '#site-language-en';
    await this.sectionNav.locator(selector).evaluate((btn) => {
      (btn as HTMLButtonElement).click();
    });
    await expect(this.page.locator('html')).toHaveAttribute('lang', language);
  }

  async submitSiteSearch(query: string): Promise<void> {
    await this.setMegaSiteSearchDraft(query);
    await expect(this.searchInput).toHaveValue(query);
    await this.page.waitForSelector('.search-result, .empty-state', { timeout: 15_000 });
  }

  async openChatbot(): Promise<void> {
    await this.floatingChatButton.evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await expect(this.assistantDialog).toBeVisible();
  }

  async closeChatbot(): Promise<void> {
    const close = this.assistantDialog.getByRole('button', { name: /Close/i });
    if (await close.isVisible().catch(() => false)) {
      await close.click();
    }
  }

  async openMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    await expect(this.mobileMenuDrawer.locator('.mobile-menu-nav')).toBeVisible();
  }

  async clickMegaMenuRoot(label: string): Promise<void> {
    await this.sectionNavLinks.filter({ hasText: label }).first().click({ position: { x: 5, y: 5 } });
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
