import { describe, expect, it } from 'vitest';
import { APP_COPY, WEATHER_ALERT_SIGNUP_FRAGMENT } from '../app-copy';
import { buildMegaMenuItems } from './build-mega-menu';

describe('buildMegaMenuItems', () => {
  it('builds root sections from English copy', () => {
    const items = buildMegaMenuItems(APP_COPY.en);
    const labels = items.map((item) => item.label);

    expect(labels).toContain(APP_COPY.en.menuQuickTasksLabel);
    expect(labels).toContain(APP_COPY.en.menuWeatherLabel);
    expect(labels).toContain(APP_COPY.en.menuContactHallLabel);
  });

  it('wires weather alert signup fragment on alert leaves', () => {
    const serialized = JSON.stringify(buildMegaMenuItems(APP_COPY.en));
    expect(serialized).toContain(`"fragment":"${WEATHER_ALERT_SIGNUP_FRAGMENT}"`);
  });
});
