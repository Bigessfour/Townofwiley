import { publicRouteContracts } from './public-routes';

/** Routes that render the standard site header + megamenu (excludes document hub lazy shell). */
export const inventoryRoutesWithSiteChrome = publicRouteContracts.filter(
  (route) => route.standardShell !== false,
);

/** Wiley header search is only rendered on the homepage (`!isFeaturePageMode()`). */
export function routeHasHeaderSearch(path: string): boolean {
  return path === '/';
}
