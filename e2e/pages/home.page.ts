import { Locator, Page, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly baseURL: string;
  readonly skipLink: Locator;
  readonly mainContent: Locator;
  readonly heroHeading: Locator;
  readonly communityFacts: Locator;
  readonly topTaskCards: Locator;
  readonly sectionNavLinks: Locator;
  readonly searchInput: Locator;
  readonly searchResults: Locator;
  readonly weatherPanel: Locator;
  readonly weatherHeading: Locator;
  readonly weatherSource: Locator;
  readonly weatherCurrentCard: Locator;
  readonly weatherAlertPill: Locator;
  readonly weatherAlertCards: Locator;
  readonly weatherRefreshButton: Locator;
  readonly noticeCards: Locator;
  readonly meetingCards: Locator;
  readonly serviceCards: Locator;
  readonly accessibilitySection: Locator;
  readonly contactCards: Locator;
  readonly footerLinks: Locator;
  readonly assistantShell: Locator;
  readonly assistantStatus: Locator;
  readonly assistantInput: Locator;
  readonly assistantSendButton: Locator;
  readonly assistantPromptButtons: Locator;
  readonly assistantMessages: Locator;
  readonly assistantLinks: Locator;

  constructor(page: Page, baseURL: string) {
    this.page = page;
    this.baseURL = baseURL;
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
    this.mainContent = page.locator('#main-content');
    this.heroHeading = page.getByRole('heading', { level: 1, name: 'Town of Wiley' });
    this.communityFacts = page.locator('.fact-card');
    this.topTaskCards = page.locator('.task-card');
    this.sectionNavLinks = page.locator('.section-nav a');
    this.searchInput = page.locator('#site-search');
    this.searchResults = page.locator('.search-result');
    this.weatherPanel = page.locator('#weather');
    this.weatherHeading = page.locator('#weather-heading');
    this.weatherSource = page.locator('.weather-source');
    this.weatherCurrentCard = page.locator('.weather-current-card');
    this.weatherAlertPill = page.locator('.weather-alert-pill');
    this.weatherAlertCards = page.locator('.weather-alert-card');
    this.weatherRefreshButton = page.locator('.weather-action').filter({ hasText: 'Refresh forecast' });
    this.noticeCards = page.locator('.notice-card');
    this.meetingCards = page.locator('.meeting-card');
    this.serviceCards = page.locator('.service-card');
    this.accessibilitySection = page.locator('#accessibility');
    this.contactCards = page.locator('.contact-card');
    this.footerLinks = page.locator('.footer-links a');
    this.assistantShell = page.locator('.assistant-shell');
    this.assistantStatus = page.locator('.assistant-status');
    this.assistantInput = page.locator('#assistant-question');
    this.assistantSendButton = page.locator('.assistant-send');
    this.assistantPromptButtons = page.locator('.assistant-chip');
    this.assistantMessages = page.locator('.assistant-message');
    this.assistantLinks = page.locator('.assistant-links a');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.heroHeading).toBeVisible();
  }

  async enableProgrammaticChat(apiEndpoint = '/mock-chatbot'): Promise<void> {
    await this.page.addInitScript((endpoint) => {
      window.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(window.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        chatbot: {
          provider: 'easyPeasy',
          mode: 'api',
          chatUrl: '',
          buttonPosition: 'bottom-right',
          apiEndpoint: endpoint,
        },
      };
    }, apiEndpoint);
  }

  async enableWeatherProxy(apiEndpoint = '/mock-weather', allowBrowserFallback = false): Promise<void> {
    await this.page.addInitScript(([endpoint, fallback]) => {
      window.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(window.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        weather: {
          apiEndpoint: endpoint,
          allowBrowserFallback: fallback,
        },
      };
    }, [apiEndpoint, allowBrowserFallback]);
  }

  async sendAssistantQuestion(question: string): Promise<void> {
    await this.assistantInput.fill(question);
    await this.assistantInput.press('Enter');
  }

  async tapWeatherRefresh(): Promise<void> {
    await this.weatherRefreshButton.scrollIntoViewIfNeeded();
    await this.weatherRefreshButton.focus();
    await this.weatherRefreshButton.press('Enter');
  }

  async searchFor(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }
}
