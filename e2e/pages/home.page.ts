import { Locator, Page, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly baseURL: string;
  readonly skipLink: Locator;
  readonly mainContent: Locator;
  readonly mobileMenuButton: Locator;
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
  readonly residentServicesSection: Locator;
  readonly residentServicePicker: Locator;
  readonly residentServiceToggles: Locator;
  readonly residentServicePaymentToggle: Locator;
  readonly residentServiceIssueToggle: Locator;
  readonly residentServiceRecordsToggle: Locator;
  readonly residentServicePaymentPanel: Locator;
  readonly residentServicePaymentName: Locator;
  readonly residentServicePaymentStreetAddress: Locator;
  readonly residentServicePaymentPhone: Locator;
  readonly residentServicePaymentEmail: Locator;
  readonly residentServicePaymentPortalAction: Locator;
  /** Billing early-access form submit (`#billing-intake`). */
  readonly residentServicePaymentSubmit: Locator;
  readonly residentServicePaymentStatus: Locator;
  readonly residentServiceIssuePanel: Locator;
  readonly residentServiceIssueCategory: Locator;
  readonly residentServiceIssueName: Locator;
  readonly residentServiceIssueLocation: Locator;
  readonly residentServiceIssueContact: Locator;
  readonly residentServiceIssueDetails: Locator;
  readonly residentServiceIssueActionButton: Locator;
  readonly residentServiceIssueStatus: Locator;
  readonly residentServiceRecordsPanel: Locator;
  readonly residentServiceRecordsType: Locator;
  readonly residentServiceRecordsName: Locator;
  readonly residentServiceRecordsContact: Locator;
  readonly residentServiceRecordsDeadline: Locator;
  readonly residentServiceRecordsDetails: Locator;
  readonly residentServiceRecordsAction: Locator;
  readonly residentServiceRecordsStatus: Locator;
  readonly accessibilitySupportSection: Locator;
  readonly accessibilityReportCard: Locator;
  readonly accessibilityReportName: Locator;
  readonly accessibilityReportContact: Locator;
  readonly accessibilityReportPage: Locator;
  readonly accessibilityReportDetails: Locator;
  readonly accessibilityReportAction: Locator;
  readonly accessibilityReportStatus: Locator;
  readonly businessDirectoryPage: Locator;
  readonly businessDirectoryHeading: Locator;
  readonly businessDirectorySearchInput: Locator;
  readonly businessDirectoryCards: Locator;
  readonly businessDirectoryEmptyState: Locator;
  readonly floatingChatButton: Locator;
  readonly assistantDialog: Locator;
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
    this.mobileMenuButton = page.locator('button.mobile-menu-button');
    this.heroHeading = page.getByRole('heading', { level: 1, name: 'Town of Wiley' });
    this.communityFacts = page.locator('.fact-card');
    this.featureCards = page.locator('.feature-grid .feature-card');
    this.topTaskCards = page.locator('.task-card');
    this.sectionNavLinks = page.locator(
      '[data-testid="homepage-section-nav"] a.mega-menu-root-link',
    );
    this.searchInput = page.locator('#mega-site-search');
    this.searchResults = page.locator('.search-result');
    this.weatherPanel = page.locator('#weather');
    this.weatherHeading = page.locator('#weather-heading');
    this.weatherSource = page.locator('.weather-source');
    this.weatherCurrentCard = page.locator('.weather-current-card');
    this.weatherAlertPill = page.locator('.weather-alert-pill');
    this.weatherAlertCards = page.locator('.weather-alert-card');
    this.weatherRefreshButton = page.locator('.weather-action-row button.weather-action');
    this.weatherSignupShell = page.locator('.weather-signup-shell');
    this.weatherSignupChannel = page.locator('#weather-alert-signup-channel');
    this.weatherSignupDestination = page.locator('#weather-alert-signup-destination');
    this.weatherSignupLanguage = page.locator('#weather-alert-signup-language');
    this.weatherSignupFullName = page.locator('#weather-alert-signup-full-name');
    this.weatherSignupZipCode = page.locator('#weather-alert-signup-zip-code');
    this.weatherSignupSubmitButton = page.locator('.weather-signup-submit');
    this.weatherSignupStatus = page.locator('.weather-signup-status');
    this.weatherSignupManageLink = page.locator('.weather-signup-unsubscribe a');
    this.siteAlert = page.locator('.site-alert--nws');
    this.siteAlertTitle = page.locator('.site-alert--nws .site-alert-title');
    this.siteAlertDetail = page.locator('.site-alert--nws .site-alert-detail').first();
    this.siteAlertLink = page
      .locator('.site-alert--nws')
      .getByRole('button', { name: /Open NWS forecast/i })
      .or(page.locator('.site-alert--nws').getByRole('link', { name: /Open NWS forecast/i }));
    this.siteAlertButton = page
      .locator('.site-alert--nws')
      .getByRole('button', { name: /Sign up for (alerts|text or email)/i })
      .or(
        page
          .locator('.site-alert--nws')
          .getByRole('link', { name: /Sign up for (alerts|text or email)/i }),
      );
    this.noticeCards = page.locator('.notice-card');
    this.meetingCards = page.locator('.meeting-card');
    this.serviceCards = page.locator('.service-card');
    this.accessibilitySection = page.locator('#accessibility');
    this.contactCards = page.locator('.contact-card');
    this.footerLinks = page.locator('.footer-links a');
    this.residentServicesSection = page.locator('.resident-services');
    this.residentServicePicker = page.locator('.resident-service-picker');
    this.residentServiceToggles = page.locator('.resident-picker-wrap');
    this.residentServicePaymentToggle = page.getByRole('button', {
      name: /Pay bill, Utilities/i,
    });
    this.residentServiceIssueToggle = page.getByRole('button', {
      name: /Report an issue, Public works/i,
    });
    this.residentServiceRecordsToggle = page.getByRole('button', {
      name: /Records & permits, Clerk/i,
    });
    this.residentServicePaymentPanel = page.locator('#payment-help');
    const portalForm = page.locator('#billing-intake');
    this.residentServicePaymentName = portalForm.getByLabel('Full name');
    this.residentServicePaymentStreetAddress = portalForm.getByLabel('Service address');
    this.residentServicePaymentPhone = portalForm.getByLabel('Phone');
    this.residentServicePaymentEmail = portalForm.getByLabel('Email');
    this.residentServicePaymentPortalAction = page.locator('#payment-help').getByRole('link', {
      name: /Pay now with Paystar/i,
    });
    this.residentServicePaymentSubmit = portalForm.getByRole('button', {
      name: 'Submit request',
    });
    this.residentServicePaymentStatus = page.locator('#payment-help .resident-status');
    this.residentServiceIssuePanel = page.locator('#issue-report');
    this.residentServiceIssueCategory = page.getByRole('combobox', {
      name: 'Water or sewer',
    });
    this.residentServiceIssueName = page.locator('#issue-report').getByLabel('Your name');
    this.residentServiceIssueLocation = page.getByLabel('Location');
    this.residentServiceIssueContact = page.getByLabel('Best phone or email for follow-up');
    this.residentServiceIssueDetails = page.getByLabel('What happened');
    this.residentServiceIssueActionButton = page.locator('#issue-report').getByRole('button', {
      name: /Send report/i,
    });
    this.residentServiceIssueStatus = page.locator('#issue-report .resident-status');
    this.residentServiceRecordsPanel = page.locator('#records-request');
    this.residentServiceRecordsType = page.getByRole('combobox', {
      name: 'Public records / FOIA',
    });
    this.residentServiceRecordsName = page.getByLabel('Resident or business name');
    this.residentServiceRecordsContact = page.getByLabel('Best phone or email for reply');
    this.residentServiceRecordsDeadline = page.getByLabel('Requested deadline or meeting date');
    this.residentServiceRecordsDetails = page
      .locator('#records-request')
      .getByLabel('Details', { exact: true });
    this.residentServiceRecordsAction = page.locator('#records-request').getByRole('button', {
      name: /Send request/i,
    });
    this.residentServiceRecordsStatus = page.locator('#records-request .resident-status');
    this.accessibilitySupportSection = page.locator('.accessibility-support-grid');
    this.accessibilityReportCard = page.locator('#barrier-report');
    this.accessibilityReportName = page.getByLabel('Your name');
    this.accessibilityReportContact = page.getByLabel('Best phone or email for follow-up');
    this.accessibilityReportPage = page.getByLabel('Page, document, or service with the barrier');
    this.accessibilityReportDetails = page.getByLabel('Describe the barrier');
    this.accessibilityReportAction = page.locator('#barrier-report .accessibility-action');
    this.accessibilityReportStatus = page.locator('#barrier-report .accessibility-status-message');
    this.businessDirectoryPage = page.locator('.business-directory-page');
    this.businessDirectoryHeading = page.getByRole('heading', {
      level: 1,
      name: 'Wiley Community Business Directory',
    });
    this.businessDirectorySearchInput = page.locator(
      '.business-directory-page input[type="search"]',
    );
    this.businessDirectoryCards = page.locator('.public-directory-card');
    this.businessDirectoryEmptyState = page.locator('.public-empty-state');
    this.floatingChatButton = page.getByRole('button', { name: /Open Ask Wiley/i });
    this.assistantDialog = page.getByRole('dialog', { name: /Ask Wiley.*Town Assistant/ });
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
    await this.page.goto('/', { waitUntil: 'commit' });
    await expect(this.heroHeading).toBeVisible();
    await this.page.evaluate(async () => {
      for (let index = 0; index < 3; index += 1) {
        const activeElement = document.activeElement;

        if (activeElement instanceof HTMLElement) {
          activeElement.blur();
        }

        await new Promise(requestAnimationFrame);
      }
    });
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

  async enablePaystarPortal(portalUrl = 'https://secure.paystar.io/townofwiley'): Promise<void> {
    await this.page.addInitScript((url) => {
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          payments?: {
            paystar?: {
              provider?: string;
              mode?: string;
              portalUrl?: string;
              apiEndpoint?: string;
            };
          };
        };
      };

      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        payments: {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.payments ?? {}),
          paystar: {
            provider: 'paystar',
            mode: 'hosted',
            portalUrl: url,
          },
        },
      };
    }, portalUrl);
  }

  async enablePaystarApi(apiEndpoint = '/e2e-mock-paystar'): Promise<void> {
    await this.page.addInitScript((endpoint) => {
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          payments?: {
            paystar?: {
              provider?: string;
              mode?: string;
              portalUrl?: string;
              apiEndpoint?: string;
            };
          };
        };
      };

      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        payments: {
          ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__?.payments ?? {}),
          paystar: {
            provider: 'paystar',
            mode: 'api',
            portalUrl: '',
            apiEndpoint: endpoint,
          },
        },
      };
    }, apiEndpoint);
  }

  async enableBillPayApi(apiEndpoint = '/api/v1/bill-pay-requests'): Promise<void> {
    await this.page.addInitScript((endpoint) => {
      const runtimeWindow = window as Window & {
        __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
          billPay?: { apiEndpoint?: string };
        };
      };

      runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
        ...(runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__ ?? {}),
        billPay: {
          apiEndpoint: endpoint,
        },
      };
    }, apiEndpoint);
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

  async selectResidentServicePanel(panel: 'payment' | 'issue' | 'records'): Promise<void> {
    const panelToggle = {
      payment: this.residentServicePaymentToggle,
      issue: this.residentServiceIssueToggle,
      records: this.residentServiceRecordsToggle,
    }[panel];

    await panelToggle.click();
  }

  async fillResidentIssueReport(details: {
    category?:
      | 'Water or sewer'
      | 'Street or pothole'
      | 'Streetlight or signage'
      | 'Property or nuisance concern'
      | 'Other town issue';
    name: string;
    location: string;
    contact: string;
    details: string;
  }): Promise<void> {
    if (details.category) {
      await this.residentServiceIssueCategory.click();
      await this.page.getByRole('option', { name: details.category, exact: true }).click();
    }

    await this.residentServiceIssueName.fill(details.name);
    await this.residentServiceIssueLocation.fill(details.location);
    await this.residentServiceIssueContact.fill(details.contact);
    await this.residentServiceIssueDetails.fill(details.details);
  }

  async fillResidentPaymentRequest(details: {
    fullName: string;
    serviceAddress: string;
    phone: string;
    email: string;
    notes?: string;
  }): Promise<void> {
    await this.residentServicePaymentName.fill(details.fullName);
    await this.residentServicePaymentStreetAddress.fill(details.serviceAddress);
    await this.residentServicePaymentPhone.fill(details.phone);
    await this.residentServicePaymentEmail.fill(details.email);
    await this.page.locator('#billing-intake').getByLabel('Preferred contact method').click();
    await this.page.getByRole('option', { name: 'Email', exact: true }).click();
    await this.page
      .locator('#billing-intake')
      .getByRole('checkbox', { name: /agree that the Town of Wiley/i })
      .check();
    if (details.notes) {
      await this.page
        .locator('#billing-intake')
        .getByLabel(/Additional questions or details/i)
        .fill(details.notes);
    }
  }

  async fillResidentRecordsRequest(details: {
    requestType?: 'records' | 'license' | 'clerk';
    name: string;
    contact: string;
    deadline?: string;
    details: string;
  }): Promise<void> {
    if (details.requestType) {
      await this.residentServiceRecordsType.click();
      await this.page
        .getByRole('option', {
          name: this.getRecordsRequestTypeLabel(details.requestType),
          exact: true,
        })
        .click();
    }

    await this.residentServiceRecordsName.fill(details.name);
    await this.residentServiceRecordsContact.fill(details.contact);

    if (details.deadline) {
      await this.residentServiceRecordsDeadline.fill(details.deadline);
    }

    await this.residentServiceRecordsDetails.fill(details.details);
  }

  async fillAccessibilityBarrierReport(details: {
    name: string;
    contact: string;
    page: string;
    details: string;
  }): Promise<void> {
    await this.accessibilityReportName.fill(details.name);
    await this.accessibilityReportContact.fill(details.contact);
    await this.accessibilityReportPage.fill(details.page);
    await this.accessibilityReportDetails.fill(details.details);
  }

  async searchBusinessDirectory(query: string): Promise<void> {
    await expect(this.businessDirectorySearchInput).toBeVisible();
    await this.businessDirectorySearchInput.click();
    await this.businessDirectorySearchInput.fill('');
    await this.businessDirectorySearchInput.fill(query);
    await expect(this.businessDirectorySearchInput).toHaveValue(query);
  }

  async clickSiteLanguage(language: 'en' | 'es'): Promise<void> {
    const selector = language === 'es' ? '#site-language-es' : '#site-language-en';
    await this.page.locator(selector).evaluate((btn) => {
      (btn as HTMLButtonElement).click();
    });
  }

  async openAssistantDialog(): Promise<void> {
    await this.floatingChatButton.evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    await expect(this.assistantDialog).toBeVisible();
  }

  async searchFor(query: string): Promise<void> {
    await this.setMegaSiteSearchDraft(query);
    await expect(this.searchInput).toHaveValue(query);
    await this.page.waitForSelector('.search-result, .empty-state', { timeout: 5000 });
  }

  /** Submit header search (works when `#mega-site-search` is hidden under the mobile breakpoint). */
  async submitHeaderSiteSearch(query: string): Promise<void> {
    await this.setMegaSiteSearchDraft(query);
    await expect(this.searchInput).toHaveValue(query);
    await this.page.locator('form.header-search-form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
  }

  /**
   * PrimeNG + signals: Playwright `fill()` does not reliably update `ngModel` when the control is
   * inside `display:none` megamenu chrome; drive the draft the same way the browser does.
   */
  private async setMegaSiteSearchDraft(query: string): Promise<void> {
    await this.searchInput.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => undefined);
    await this.page.locator('#mega-site-search').evaluate((el, q) => {
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
    await expect(this.weatherSignupShell).toBeVisible();
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

  private getRecordsRequestTypeLabel(requestType: 'records' | 'license' | 'clerk'): string {
    const requestTypeLabels = {
      records: 'Public records / FOIA',
      license: 'License or fee question',
      clerk: 'Clerk assistance',
    };

    return requestTypeLabels[requestType];
  }

  private async selectPrimeSelectOption(combobox: Locator, optionLabel: string): Promise<void> {
    await combobox.scrollIntoViewIfNeeded();
    await expect(combobox).toBeVisible();
    await this.page.keyboard.press('Escape');
    const host = combobox.locator('xpath=ancestor::*[contains(@class,"p-select")][1]');
    const trigger = host.getByRole('button', { name: 'dropdown trigger' });

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await trigger.click({ force: true });
        const overlay = this.page.locator('.p-select-list-container').last();
        const choice = overlay.getByText(optionLabel, { exact: true });
        await expect(choice).toBeVisible({ timeout: 4000 });
        await choice.click();
        await expect(combobox).toHaveAccessibleName(optionLabel);
        return;
      } catch (error) {
        lastError = error;
        await this.page.keyboard.press('Escape');
      }
    }

    throw lastError;
  }
}
