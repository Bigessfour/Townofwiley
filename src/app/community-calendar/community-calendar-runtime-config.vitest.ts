import { afterEach, describe, expect, it } from 'vitest';
import { readCommunityCalendarRuntimeConfig } from './community-calendar-runtime-config';

type RuntimeWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: { communityCalendar?: { apiEndpoint?: string } };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: { communityCalendar?: { apiEndpoint?: string } };
};

describe('readCommunityCalendarRuntimeConfig', () => {
  afterEach(() => {
    const runtimeWindow = window as RuntimeWindow;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG__;
    delete runtimeWindow.__TOW_RUNTIME_CONFIG_OVERRIDE__;
  });

  it('returns empty endpoint when runtime config is missing', () => {
    expect(readCommunityCalendarRuntimeConfig()).toEqual({ apiEndpoint: '' });
  });

  it('reads apiEndpoint from __TOW_RUNTIME_CONFIG__', () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      communityCalendar: { apiEndpoint: ' https://calendar.example/ ' },
    };
    expect(readCommunityCalendarRuntimeConfig()).toEqual({
      apiEndpoint: 'https://calendar.example/',
    });
  });

  it('lets __TOW_RUNTIME_CONFIG_OVERRIDE__ win for e2e mocks', () => {
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG__ = {
      communityCalendar: { apiEndpoint: 'https://live.example' },
    };
    (window as RuntimeWindow).__TOW_RUNTIME_CONFIG_OVERRIDE__ = {
      communityCalendar: { apiEndpoint: '/mock-community-calendar' },
    };
    expect(readCommunityCalendarRuntimeConfig()).toEqual({
      apiEndpoint: '/mock-community-calendar',
    });
  });
});
