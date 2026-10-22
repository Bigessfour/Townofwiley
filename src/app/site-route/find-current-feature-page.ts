import type { FeaturePage } from '../app-copy';

/** Match the active feature page for meta/title chrome (maps /notices → news). */
export function findCurrentFeaturePage(
  path: string,
  pages: readonly FeaturePage[],
): FeaturePage | null {
  if (path === '/notices') {
    return pages.find((page) => page.href === '/news') ?? null;
  }

  return pages.find((page) => page.href === path) ?? null;
}
