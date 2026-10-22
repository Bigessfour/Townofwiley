import type { SearchItem } from '../app-copy';

/** Rank a search index row against a normalized query and its terms. */
export function scoreSearchItem(
  item: SearchItem,
  terms: string[],
  normalizedQuery: string,
): number {
  const title = item.title.toLowerCase();
  const summary = item.summary.toLowerCase();
  const category = item.category.toLowerCase();
  const href = item.href.toLowerCase();
  const keywords = item.keywords.map((keyword) => keyword.toLowerCase());
  const haystack = [title, summary, category, ...keywords].join(' ');
  const hasMeetingIntent = terms.some((term) =>
    ['meeting', 'meetings', 'calendar', 'agenda', 'council'].includes(term),
  );
  const hasContactIntent = terms.some((term) =>
    ['contact', 'clerk', 'email', 'phone', 'call'].includes(term),
  );
  const hasDocumentIntent = terms.some((term) =>
    [
      'document',
      'documents',
      'record',
      'records',
      'minutes',
      'packet',
      'form',
      'pdf',
      'archive',
      'guide',
    ].includes(term),
  );

  if (!terms.every((term) => haystack.includes(term))) {
    return 0;
  }

  let score = 0;

  if (title.includes(normalizedQuery)) {
    score += 40;
  }

  if (category.includes(normalizedQuery)) {
    score += 20;
  }

  if (summary.includes(normalizedQuery)) {
    score += 10;
  }

  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) {
    score += 16;
  }

  if ((href === '/meetings' || href.startsWith('/meetings#')) && hasMeetingIntent) {
    score += 30;
  }

  if (
    (href === '/contact' || href.startsWith('mailto:') || href.startsWith('tel:')) &&
    hasContactIntent
  ) {
    score += 24;
  }

  if (
    href.startsWith('mailto:') &&
    title.includes('clerk') &&
    terms.some((term) => ['clerk', 'deb', 'dillon'].includes(term))
  ) {
    score += 48;
  }

  if (href.startsWith('/meetings#') && !hasDocumentIntent) {
    score -= 12;
  }

  for (const term of terms) {
    if (title.includes(term)) {
      score += 8;
    }

    if (category.includes(term)) {
      score += 6;
    }

    if (keywords.some((keyword) => keyword.includes(term))) {
      score += 4;
    }

    if (summary.includes(term)) {
      score += 2;
    }

    if (href.includes(term)) {
      score += 1;
    }
  }

  return score;
}
