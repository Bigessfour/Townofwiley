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
  '/businesses',
  '/news',
  '/contact',
  '/accessibility',
  '/privacy',
  '/terms',
]);

const EXTERNAL_LINK_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function getAppRouteLink(
  href: string | null | undefined,
  defaultPath = '/',
): AppRouteLink {
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
      path: defaultPath,
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
  const path = pathPart || '/';

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