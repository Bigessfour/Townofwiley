import { Locator, Page, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly baseURL: string;
  readonly skipLink: Locator;
  readonly heroHeading: Locator;
  readonly communityFacts: Locator;
  readonly topTaskCards: Locator;
  readonly sectionNavLinks: Locator;
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  readonly noticeCards: Locator;
  readonly meetingCards: Locator;
  readonly serviceCards: Locator;
  readonly accessibilitySection: Locator;
  readonly contactCards: Locator;
  readonly footerLinks: Locator;

  constructor(page: Page, baseURL: string) {
    this.page = page;
    this.baseURL = baseURL;
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
    this.heroHeading = page.getByRole('heading', { level: 1, name: 'Town of Wiley' });
    this.communityFacts = page.locator('.fact-card');
    this.topTaskCards = page.locator('.task-card');
    this.sectionNavLinks = page.locator('.section-nav a');
    this.searchInput = page.locator('#site-search');
    this.searchResults = page.locator('.search-result');
    this.noticeCards = page.locator('.notice-card');
    this.meetingCards = page.locator('.meeting-card');
    this.serviceCards = page.locator('.service-card');
    this.accessibilitySection = page.locator('#accessibility');
    this.contactCards = page.locator('.contact-card');
    this.footerLinks = page.locator('.footer-links a');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.heroHeading).toBeVisible();
  }

  async searchFor(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }
}
