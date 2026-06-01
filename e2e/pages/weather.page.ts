import type { Locator, Page } from '@playwright/test';

import { PublicRoutePage } from './public-route.page';

export class WeatherPage extends PublicRoutePage {
  readonly heading: Locator;
  readonly signupShell: Locator;
  readonly signupDestination: Locator;
  readonly signupSubmit: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page, '/weather');
    this.heading = page.locator('#weather-heading');
    this.signupShell = page.locator('.weather-signup-shell');
    this.signupDestination = page.locator('#weather-alert-signup-destination');
    this.signupSubmit = page.locator('.weather-signup-submit');
    this.refreshButton = page.locator('.weather-action-row button.weather-action');
  }
}
