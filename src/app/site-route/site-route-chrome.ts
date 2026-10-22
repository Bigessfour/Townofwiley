import { isPathRegisteredAppRoute } from '../internal-route-link';

/** Shell chrome flags derived from the current app path (no Angular DI). */
export interface SiteRouteChrome {
  isAdminMode: boolean;
  isAdminLoginMode: boolean;
  isClerkSetupMode: boolean;
  /** Always false stub after /documents redirect; kept until Phase 5 cleanup. */
  isDocumentHubMode: boolean;
  isWeatherMode: boolean;
  isMeetingsMode: boolean;
  isServicesMode: boolean;
  /** Always false stub after /records redirect; kept until Phase 5 cleanup. */
  isRecordsMode: boolean;
  isContactMode: boolean;
  isAccessibilityMode: boolean;
  isPrivacyMode: boolean;
  isTermsMode: boolean;
  isBusinessesMode: boolean;
  isHistoryMode: boolean;
  isNewsMode: boolean;
  isPaymentsMode: boolean;
  isTopLevelLazyRouteMode: boolean;
  isFeaturePageMode: boolean;
  isNotFoundMode: boolean;
  shouldPrimeWeatherAlerts: boolean;
}

/** Resolve public-site chrome mode flags from a normalized path. */
export function resolveSiteRouteChrome(path: string): SiteRouteChrome {
  const isAdminMode = path === '/admin';
  const isAdminLoginMode = path === '/admin/login' || path === '/admin/new-staff';
  const isClerkSetupMode = path === '/clerk-setup';
  const isDocumentHubMode = false;
  const isWeatherMode = path === '/weather';
  const isMeetingsMode = path === '/meetings';
  const isServicesMode = path === '/services';
  const isRecordsMode = false;
  const isContactMode = path === '/contact';
  const isAccessibilityMode = path === '/accessibility';
  const isPrivacyMode = path === '/privacy';
  const isTermsMode = path === '/terms';
  const isBusinessesMode = path === '/businesses';
  const isHistoryMode = path === '/history';
  /** `/notices` is a redirect; treat first paint as news hub so chrome does not flash home. */
  const isNewsMode = path === '/news' || path === '/notices';
  const isPaymentsMode = path === '/pay-bill' || path === '/payments';
  const isTopLevelLazyRouteMode =
    isAdminMode || isAdminLoginMode || isClerkSetupMode || isDocumentHubMode;
  const isFeaturePageMode =
    isWeatherMode ||
    isMeetingsMode ||
    isServicesMode ||
    isContactMode ||
    isAccessibilityMode ||
    isPrivacyMode ||
    isTermsMode ||
    isBusinessesMode ||
    isHistoryMode ||
    isNewsMode ||
    isPaymentsMode;
  const isNotFoundMode =
    !isTopLevelLazyRouteMode &&
    path !== '/' &&
    path !== '' &&
    !isPathRegisteredAppRoute(path);
  const shouldPrimeWeatherAlerts =
    !isAdminMode && !isClerkSetupMode && !isDocumentHubMode && !isWeatherMode;

  return {
    isAdminMode,
    isAdminLoginMode,
    isClerkSetupMode,
    isDocumentHubMode,
    isWeatherMode,
    isMeetingsMode,
    isServicesMode,
    isRecordsMode,
    isContactMode,
    isAccessibilityMode,
    isPrivacyMode,
    isTermsMode,
    isBusinessesMode,
    isHistoryMode,
    isNewsMode,
    isPaymentsMode,
    isTopLevelLazyRouteMode,
    isFeaturePageMode,
    isNotFoundMode,
    shouldPrimeWeatherAlerts,
  };
}
