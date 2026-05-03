export interface AppRouteLink {
  href: string;
  isInternal: boolean;
  path: string | null;
  fragment?: string;
}

const APP_ROUTE_PATHS = new Set([
  '/',
  '/admin',
  '/clerk-setup',
  '/documents',
  '/notices',
  '/meetings',
  '/weather',
  '/services',
  '/records',
  '/payments',
  '/pay-bill',
  '/permits',
  '/businesses',
  '/news',
  '/contact',
  '/accessibility',
  '/privacy',
  '/terms',
]);

const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Normalizes an app path for matching: trims, strips query string, removes trailing slashes (except root).
 */
export function normalizeAppRoutePath(raw: string): string {
  const trimmed = raw.trim();
  const withoutQuery = trimmed.split('?', 1)[0] ?? '';
  const collapsed = withoutQuery.replace(/\/+$/, '') || '/';

  return collapsed === '' ? '/' : collapsed;
}

/** True when `path` matches a first-class in-app route (after normalization). */
export function isPathRegisteredAppRoute(path: string): boolean {
  return APP_ROUTE_PATHS.has(normalizeAppRoutePath(path));
}

export function getAppRouteLink(href: string | null | undefined, defaultPath = '/'): AppRouteLink {
  const normalizedHref = href?.trim() ?? '';

  if (!normalizedHref) {
    return {
      href: '',
      isInternal: false,
      path: null,
    };
  }

  if (normalizedHref.startsWith('#')) {
    return {
      href: normalizedHref,
      isInternal: true,
      path: normalizeAppRoutePath(defaultPath),
      fragment: normalizedHref.slice(1) || undefined,
    };
  }

  if (EXTERNAL_LINK_PATTERN.test(normalizedHref)) {
    return {
      href: normalizedHref,
      isInternal: false,
      path: null,
    };
  }

  const [pathPart, fragmentPart] = normalizedHref.split('#', 2);
  const path = normalizeAppRoutePath(pathPart || '/');

  if (APP_ROUTE_PATHS.has(path)) {
    return {
      href: normalizedHref,
      isInternal: true,
      path,
      fragment: fragmentPart || undefined,
    };
  }

  return {
    href: normalizedHref,
    isInternal: false,
    path: null,
  };
}
