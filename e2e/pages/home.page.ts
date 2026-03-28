import { Locator, Page, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly baseURL: string;
  readonly skipLink: Locator;
  readonly mainContent: Locator;
  readonly heroHeading: Locator;
  readonly communityFacts: Locator;
  readonly featureCards: Locator;
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
  readonly weatherSignupShell: Locator;
  readonly weatherSignupChannel: Locator;
  readonly weatherSignupDestination: Locator;
  readonly weatherSignupLanguage: Locator;
  readonly weatherSignupFullName: Locator;
  readonly weatherSignupZipCode: Locator;
  readonly weatherSignupSubmitButton: Locator;
  readonly weatherSignupStatus: Locator;
  readonly weatherSignupManageLink: Locator;
  readonly siteAlert: Locator;
  readonly siteAlertTitle: Locator;
  readonly siteAlertDetail: Locator;
  readonly siteAlertLink: Locator;
  readonly siteAlertButton: Locator;
  readonly noticeCards: Locator;
  readonly meetingCards: Locator;
  readonly serviceCards: Locator;
  readonly accessibilitySection: Locator;
  readonly contactCards: Locator;
  readonly footerLinks: Locator;
  readonly assistantShell: Locator;
  readonly assistantStatus: Locator;
  readonly assistantThreadStatus: Locator;
  readonly assistantInput: Locator;
  readonly assistantSendButton: Locator;
  readonly assistantPromptButtons: Locator;
  readonly assistantMessages: Locator;
  readonly assistantLinks: Locator;
  readonly weatherUpdatedLabel: Locator;
  readonly emptySearchState: Locator;

  constructor(page: Page, baseURL: string) {
    this.page = page;
    this.baseURL = baseURL;
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
    this.mainContent = page.locator('#main-content');
    this.heroHeading = page.getByRole('heading', { level: 1, name: 'Town of Wiley' });
    this.communityFacts = page.locator('.fact-card');
    this.featureCards = page.locator('.feature-grid .feature-card');
    this.topTaskCards = page.locator('.task-card');
    this.sectionNavLinks = page.locator('[data-testid="homepage-section-nav"] .p-menubar-root-list > li > a');
    this.searchInput = page.locator('#site-search');
    this.searchResults = page.locator('.search-result');
    this.weatherPanel = page.locator('#weather');
    this.weatherHeading = page.locator('#weather-heading');
    this.weatherSource = page.locator('.weather-source');
    this.weatherCurrentCard = page.locator('.weather-current-card');
    this.weatherAlertPill = page.locator('.weather-alert-pill');
    this.weatherAlertCards = page.locator('.weather-alert-card');
    this.weatherRefreshButton = page.locator('.weather-action-row > button.weather-action');
    this.weatherSignupShell = page.locator('.weather-signup-shell');
    this.weatherSignupChannel = page.locator('#weather-alert-signup-channel');
    this.weatherSignupDestination = page.locator('#weather-alert-signup-destination');
    this.weatherSignupLanguage = page.locator('#weather-alert-signup-language');
    this.weatherSignupFullName = page.locator('#weather-alert-signup-full-name');
    this.weatherSignupZipCode = page.locator('#weather-alert-signup-zip-code');
    this.weatherSignupSubmitButton = page.locator('.weather-signup-submit');
    this.weatherSignupStatus = page.locator('.weather-signup-status-message');
    this.weatherSignupManageLink = page.locator('.weather-signup-unsubscribe a');
    this.siteAlert = page.locator('.site-alert');
    this.siteAlertTitle = page.locator('.site-alert-title');
    this.siteAlertDetail = page.locator('.site-alert-detail');
    this.siteAlertLink = page.locator('.site-alert-link');
    this.siteAlertButton = page.locator('.site-alert-button');
    this.noticeCards = page.locator('.notice-card');
    this.meetingCards = page.locator('.meeting-card');
    this.serviceCards = page.locator('.service-card');
    this.accessibilitySection = page.locator('#accessibility');
    this.contactCards = page.locator('.contact-card');
    this.footerLinks = page.locator('.footer-links a');
    this.assistantShell = page.locator('.assistant-shell');
    this.assistantStatus = page.locator('.assistant-status');
    this.assistantThreadStatus = page.locator('.assistant-thread-status');
    this.assistantInput = page.locator('#assistant-question');
    this.assistantSendButton = page.locator('.assistant-send');
    this.assistantPromptButtons = page.locator('.assistant-chip');
    this.assistantMessages = page.locator('.assistant-message');
    this.assistantLinks = page.locator('.assistant-links a');
    this.weatherUpdatedLabel = page.locator('.weather-updated');
    this.emptySearchState = page.locator('.empty-state');
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(this.heroHeading).toBeVisible();
  }

  async enableProgrammaticChat(apiEndpoint = '/mock-chatbot'): Promise<void> {
    await this.page.addInitScript((endpoint) => {
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          chatbot?: {
            provider?: string;
            mode?: string;
            chatUrl?: string;
            buttonPosition?: string;
            apiEndpoint?: string;
          };
          weather?: {
            apiEndpoint?: string;
            allowBrowserFallback?: boolean;
          };
        };
      };

      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
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

  async enableWeatherProxy(
    apiEndpoint = '/mock-weather',
    allowBrowserFallback = false,
  ): Promise<void> {
    await this.page.addInitScript(
      (args) => {
        const [endpoint, fallback] = args as [string, boolean];

        const runtimeWindow = window as Window & {
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
            chatbot?: {
              provider?: string;
              mode?: string;
              chatUrl?: string;
              buttonPosition?: string;
              apiEndpoint?: string;
            };
            weather?: {
              apiEndpoint?: string;
              allowBrowserFallback?: boolean;
            };
          };
        };

        runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
          weather: {
            apiEndpoint: endpoint,
            allowBrowserFallback: fallback,
          },
        };
      },
      [apiEndpoint, allowBrowserFallback],
    );
  }

  async enableAlertSignup(apiEndpoint = '/mock-alert-signup', enabled = true): Promise<void> {
    await this.page.addInitScript(
      (args) => {
        const [endpoint, isEnabled] = args as [string, boolean];

        const runtimeWindow = window as Window & {
          __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
            chatbot?: {
              provider?: string;
              mode?: string;
              chatUrl?: string;
              buttonPosition?: string;
              apiEndpoint?: string;
            };
            weather?: {
              apiEndpoint?: string;
              allowBrowserFallback?: boolean;
              alertSignup?: {
                enabled?: boolean;
                apiEndpoint?: string;
              };
            };
          };
        };

        runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
          weather: {
            ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.weather ?? {}),
            alertSignup: {
              enabled: isEnabled,
              apiEndpoint: endpoint,
            },
          },
        };
      },
      [apiEndpoint, enabled],
    );
  }

  async sendAssistantQuestion(question: string): Promise<void> {
    await expect(this.assistantInput).toBeEnabled();
    await this.assistantInput.fill(question);
    await expect(this.assistantInput).toHaveValue(question);
    await this.assistantInput.press('Enter');
    await expect(this.assistantInput).toHaveValue('');
  }

  async chooseAssistantPrompt(prompt: string): Promise<void> {
    await this.assistantPromptButtons.filter({ hasText: prompt }).click();
    await expect(this.assistantInput).toHaveValue('');
  }

  async tapWeatherRefresh(): Promise<void> {
    await expect(this.weatherRefreshButton).toBeVisible();
    await expect(this.weatherRefreshButton).toBeEnabled();
    await this.weatherRefreshButton.click();
  }

  async searchFor(query: string): Promise<void> {
    await this.searchInput.scrollIntoViewIfNeeded();
    await this.searchInput.fill(query);
    await expect(this.searchInput).toHaveValue(query);
    await this.page.waitForSelector('.search-result, .empty-state', { timeout: 5000 });
  }

  async submitWeatherAlertSignup(
    destination: string,
    fullName?: string,
    preferredLanguage?: 'en' | 'es',
  ): Promise<void> {
    await this.weatherSignupDestination.fill(destination);

    if (preferredLanguage) {
      await this.chooseWeatherSignupLanguage(preferredLanguage);
    }

    if (fullName) {
      await this.weatherSignupFullName.fill(fullName);
    }

    await this.weatherSignupSubmitButton.scrollIntoViewIfNeeded();
    await this.weatherSignupSubmitButton.click();
  }

  async chooseWeatherSignupChannel(channel: 'email' | 'sms'): Promise<void> {
    await this.selectPrimeSelectOption(
      this.weatherSignupChannel,
      channel === 'email' ? 'Email' : 'SMS text',
    );
  }

  async chooseWeatherSignupLanguage(language: 'en' | 'es'): Promise<void> {
    await this.selectPrimeSelectOption(
      this.weatherSignupLanguage,
      language === 'es' ? 'Spanish' : 'English',
    );
  }

  private async selectPrimeSelectOption(combobox: Locator, optionLabel: string): Promise<void> {
    await combobox.click();
    await this.page.getByRole('option', { name: optionLabel, exact: true }).click();
  }
}
