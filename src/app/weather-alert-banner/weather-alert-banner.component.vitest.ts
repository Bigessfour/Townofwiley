/**
 * Docs: weather alert banner on homepage / weather panel
 * E2E: e2e/specs/smoke/home.weather.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { WeatherAlertBannerComponent } from './weather-alert-banner.component';

describe('WeatherAlertBannerComponent', () => {
  it('exports the weather alert banner surface', () => {
    expect(WeatherAlertBannerComponent.name).toBe('WeatherAlertBannerComponent');
  });
});
