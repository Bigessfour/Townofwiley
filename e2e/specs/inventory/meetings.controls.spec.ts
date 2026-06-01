import { expect } from '@playwright/test';

import { test } from '../../fixtures/town-pages.fixture';
import { inventoryStep } from '../../support/inventory-step';
import { siteContent } from '../../support/site-content';
import { expectMeetingsCalendar } from '../../support/route-assertions';

test.describe('meetings page inventory controls', () => {
  test('[meetings.calendar-visible] FullCalendar panel is visible', async ({ meetingsPage }) => {
    await meetingsPage.goto();

    await inventoryStep('Verify meetings calendar', async () => {
      await expectMeetingsCalendar(meetingsPage.page);
    });
  });

  test('[meetings.meeting-rows-visible] meeting summary rows render', async ({ meetingsPage }) => {
    await meetingsPage.goto();

    await inventoryStep('Verify meeting rows', async () => {
      await expect(meetingsPage.meetingRows).toHaveCount(siteContent.homepageCounts.meetingCards, {
        timeout: 20_000,
      });
    });
  });
});
