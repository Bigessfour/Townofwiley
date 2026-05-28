import { AccessibilityPage } from '../pages/accessibility.page';
import { BusinessesPage } from '../pages/businesses.page';
import { ContactPage } from '../pages/contact.page';
import { DocumentsPage } from '../pages/documents.page';
import { MeetingsPage } from '../pages/meetings.page';
import { NewsPage } from '../pages/news.page';
import { NoticesPage } from '../pages/notices.page';
import { PayBillPage } from '../pages/pay-bill.page';
import { PermitsPage } from '../pages/permits.page';
import { PrivacyPage } from '../pages/privacy.page';
import { RecordsPage } from '../pages/records.page';
import { ServicesPage } from '../pages/services.page';
import { SiteChromePage } from '../pages/site-chrome.page';
import { TermsPage } from '../pages/terms.page';
import { WeatherPage } from '../pages/weather.page';
import { test as townTest, expect } from './town.fixture';

export interface TownPageFixtures {
  siteChrome: SiteChromePage;
  documentsPage: DocumentsPage;
  weatherPage: WeatherPage;
  payBillPage: PayBillPage;
  contactPage: ContactPage;
  meetingsPage: MeetingsPage;
  noticesPage: NoticesPage;
  servicesPage: ServicesPage;
  recordsPage: RecordsPage;
  businessesPage: BusinessesPage;
  permitsPage: PermitsPage;
  newsPage: NewsPage;
  accessibilityPage: AccessibilityPage;
  privacyPage: PrivacyPage;
  termsPage: TermsPage;
}

export const test = townTest.extend<TownPageFixtures>({
  siteChrome: async ({ page }, use) => {
    await use(new SiteChromePage(page));
  },
  documentsPage: async ({ page }, use) => {
    await use(new DocumentsPage(page));
  },
  weatherPage: async ({ page }, use) => {
    await use(new WeatherPage(page));
  },
  payBillPage: async ({ page }, use) => {
    await use(new PayBillPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  meetingsPage: async ({ page }, use) => {
    await use(new MeetingsPage(page));
  },
  noticesPage: async ({ page }, use) => {
    await use(new NoticesPage(page));
  },
  servicesPage: async ({ page }, use) => {
    await use(new ServicesPage(page));
  },
  recordsPage: async ({ page }, use) => {
    await use(new RecordsPage(page));
  },
  businessesPage: async ({ page }, use) => {
    await use(new BusinessesPage(page));
  },
  permitsPage: async ({ page }, use) => {
    await use(new PermitsPage(page));
  },
  newsPage: async ({ page }, use) => {
    await use(new NewsPage(page));
  },
  accessibilityPage: async ({ page }, use) => {
    await use(new AccessibilityPage(page));
  },
  privacyPage: async ({ page }, use) => {
    await use(new PrivacyPage(page));
  },
  termsPage: async ({ page }, use) => {
    await use(new TermsPage(page));
  },
});

export { expect };
