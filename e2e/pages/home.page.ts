import { Locator, Page, expect } from '@playwright/test';
import { clickVisibleSiteLanguage } from '../support/site-language-toggle';

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
  /** Desktop mega menu host (`p-megamenu`); scope header chrome to avoid strict-mode clashes with other `ES`/`EN` controls. */
  readonly sectionNav: Locator;
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
  readonly residentServiceWeatherToggle: Locator;
  readonly residentServicePaymentPanel: Locator;
  readonly residentServicePaymentPayBillLink: Locator;
  readonly residentServiceIssuePanel: Locator;
  readonly residentServiceIssueCategory: Locator;
  readonly residentServiceIssueName: Locator;
  readonly residentServiceIssueLocation: Locator;
  readonly residentServiceIssueContact: Locator;
  readonly residentServiceIssueDetails: Locator;
  readonly residentServiceIssueActionButton: Locator;
  readonly residentServiceIssueStatus: Locator;
  readonly residentServiceWeatherPanel: Locator;
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
      '[data-testid="homepage-section-nav"] .primary-nav-link, [data-testid="homepage-section-nav"] .mega-menu-root-link',
    );
    this.sectionNav = page.getByTestId('homepage-section-nav');
    this.searchInput = page.locator('#mega-site-search, #landing-site-search').first();
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
    const residentServicesRoot = page.locator('#resident-services');
    this.residentServicePaymentToggle = residentServicesRoot.getByRole('button', {
      name: /Pay bill, Utilities/i,
    });
    this.residentServiceIssueToggle = residentServicesRoot.getByRole('button', {
      name: /Report an issue, Public works/i,
    });
    this.residentServiceWeatherToggle = residentServicesRoot.getByRole('button', {
      name: /Weather alerts, Safety/i,
    });
    this.residentServicePaymentPanel = page.locator('#payment-help');
    this.residentServicePaymentPayBillLink = page.getByTestId('resident-pay-bill-link');
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
    this.residentServiceWeatherPanel = page.locator('#weather-alerts');
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

  async enablePaystarHostedWithoutPortal(): Promise<void> {
    await this.page.addInitScript(() => {
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
            portalUrl: '',
            apiEndpoint: '',
          },
        },
      };
    });
  }

  async disablePaystarPortal(): Promise<void> {
    await this.page.addInitScript(() => {
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
            mode: 'none',
            portalUrl: '',
            apiEndpoint: '',
          },
        },
      };
    });
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

  async tapWeatherRefresh(): Promise<void> {
    await expect(this.weatherRefreshButton).toBeVisible();
    await expect(this.weatherRefreshButton).toBeEnabled();
    await this.weatherRefreshButton.click();
  }

  async selectResidentServicePanel(panel: 'payment' | 'issue' | 'weather'): Promise<void> {
    const panelToggle = {
      payment: this.residentServicePaymentToggle,
      issue: this.residentServiceIssueToggle,
      weather: this.residentServiceWeatherToggle,
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
    await clickVisibleSiteLanguage(this.page, language);
  }

  async clickTownLogoHome(): Promise<void> {
    const megamenuLogo = this.sectionNav.locator('a.town-logo');
    if (await megamenuLogo.isVisible().catch(() => false)) {
      await megamenuLogo.click();
      return;
    }
    await this.page.locator('.site-header a.town-logo').first().click();
  }

  async searchFor(query: string): Promise<void> {
    await this.page
      .locator('#search-panel')
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await this.setMegaSiteSearchDraft(query);
    await expect(this.searchInput).toHaveValue(query);
    await expect(this.page.locator('.search-results--loading')).toHaveCount(0, { timeout: 10_000 });
    await expect
      .poll(async () => this.page.locator('.search-results .search-result, .empty-state').count())
      .toBeGreaterThan(0);
  }

  /** Submit header search (works when `#mega-site-search` is hidden under the mobile breakpoint). */
  async submitHeaderSiteSearch(query: string): Promise<void> {
    await this.setMegaSiteSearchDraft(query);
    await expect(this.searchInput).toHaveValue(query);
    await this.sectionNav.locator('form.header-search-form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    });
  }

  /**
   * PrimeNG + signals: Playwright `fill()` does not reliably update `ngModel` when the control is
   * inside `display:none` megamenu chrome; drive the draft the same way the browser does.
   */
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
