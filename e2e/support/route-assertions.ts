import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import type { HomePage } from '../pages/home.page';
import { siteContent } from './site-content';

export async function expectWeatherPageHeading(page: Page): Promise<void> {
  await expect(page.locator('#weather-heading')).toContainText('National Weather Service forecast');
}

export async function expectNoticesPageCards(homePage: HomePage): Promise<void> {
  await expect(homePage.noticeCards).toHaveCount(siteContent.homepageCounts.noticeCards);
}

export async function expectMeetingsCalendar(page: Page): Promise<void> {
  await expect(page.locator('#calendar')).toBeVisible({ timeout: 20_000 });
}

export async function expectServicesPage(homePage: HomePage): Promise<void> {
  await expect(homePage.serviceCards).toHaveCount(siteContent.homepageCounts.serviceCards);
  await expect(homePage.page.locator('#resident-services')).toBeVisible();
}

export async function expectRecordsPage(page: Page): Promise<void> {
  await expect(page.getByTestId('records-guide-packets')).toBeVisible();
  await expect(
    page.getByTestId('records-guide-packets').getByRole('link', {
      name: 'Open meeting documents destination',
    }),
  ).toBeVisible();
}

export async function expectAccessibilityBarrierReport(page: Page): Promise<void> {
  await expect(page.locator('#barrier-report')).toContainText('Open accessibility report email');
}

export async function expectBusinessesPage(page: Page): Promise<void> {
  await expect(page.locator('#business-directory-heading')).toContainText(
    siteContent.cmsHeadings.businesses,
  );
}

export async function expectContactPage(page: Page): Promise<void> {
  await expect(page.locator('#contact')).toContainText('Deb Dillon');
}

export async function expectTopTasksAnchor(page: Page): Promise<void> {
  await expect(page.locator('#top-tasks')).toBeVisible();
}

export async function expectPayBillPage(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Pay Your Utility Bill Online' }),
  ).toBeVisible();
}

export async function expectServiceIssueReport(page: Page): Promise<void> {
  await expect(page.locator('#issue-report')).toBeVisible();
}

export async function expectServiceRecordsRequest(page: Page): Promise<void> {
  await expect(page.locator('#records-request')).toBeVisible();
}

export async function expectDocumentsHub(page: Page): Promise<void> {
  await expect(page.getByTestId('document-hub-title')).toBeVisible();
}

export async function expectPermitsPage(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: /Permits & Inquiries/i })).toBeVisible();
}

export async function expectNewsPage(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Town News and Announcements' }),
  ).toBeVisible();
}

export async function expectPrivacyPage(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Weather alert privacy notice' }),
  ).toBeVisible();
}

export async function expectTermsPage(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { level: 1, name: 'Weather alert SMS terms' }),
  ).toBeVisible();
}
