import type { MegaMenuItem } from 'primeng/api';

/** Wrap leaf links into a PrimeNG mega-menu column group. */
export function megaMenuColumn(links: MegaMenuItem[], groupLabel?: string): MegaMenuItem[] {
  // Prime typings declare `items` as MenuItem[][]; flyout group rows use a flat leaf list at runtime.
  const group: MegaMenuItem = { items: links as MegaMenuItem[][] };
  const trimmed = groupLabel?.trim();
  if (trimmed) {
    group.label = trimmed;
  }
  return [group];
}
