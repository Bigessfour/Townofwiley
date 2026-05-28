import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class MeetingsPage extends PublicRoutePage {
  readonly calendar: Locator;
  readonly meetingRows: Locator;

  constructor(page: Page) {
    super(page, '/meetings');
    this.calendar = page.locator('#calendar');
    this.meetingRows = page.locator('.meetings-table tbody tr');
  }
}
