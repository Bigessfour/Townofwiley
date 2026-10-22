import type { SearchItem } from '../app-copy';

/** Drop duplicate search rows that share the same href + title. */
export function dedupeSearchItems(items: SearchItem[]): SearchItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.href}::${item.title}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
