/** Collect non-empty keyword fragments for a search index row. */
export function buildSearchKeywords(...values: (string | null | undefined)[]): string[] {
  return values.filter((value): value is string => Boolean(value?.trim()));
}
