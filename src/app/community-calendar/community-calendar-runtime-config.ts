/**
 * Browser runtime community calendar settings from `public/runtime-config.js`.
 */
export interface CommunityCalendarRuntimeConfig {
  apiEndpoint: string;
}

type RuntimeCommunityWindow = Window & {
  __TOW_RUNTIME_CONFIG__?: {
    communityCalendar?: {
      apiEndpoint?: string;
    };
  };
  __TOW_RUNTIME_CONFIG_OVERRIDE__?: {
    communityCalendar?: {
      apiEndpoint?: string;
    };
  };
};

export function readCommunityCalendarRuntimeConfig(): CommunityCalendarRuntimeConfig {
  const runtimeWindow =
    typeof window === 'undefined' ? undefined : (window as RuntimeCommunityWindow);
  const config = {
    ...(runtimeWindow?.__TOW_RUNTIME_CONFIG__?.communityCalendar ?? {}),
    ...(runtimeWindow?.__TOW_RUNTIME_CONFIG_OVERRIDE__?.communityCalendar ?? {}),
  };

  return {
    apiEndpoint: typeof config.apiEndpoint === 'string' ? config.apiEndpoint.trim() : '',
  };
}
