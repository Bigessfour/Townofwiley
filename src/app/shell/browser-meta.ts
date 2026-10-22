export const DEFAULT_SITE_TITLE = 'Town of Wiley';
export const MAX_META_DESCRIPTION_LENGTH = 160;

export function truncateMetaDescription(
  value: string,
  maxLength = MAX_META_DESCRIPTION_LENGTH,
): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function buildBrowserTitle(input: {
  siteTitle: string;
  featureTitle: string | null | undefined;
  isNotFound: boolean;
  notFoundBrowserTitle: string;
}): string {
  const siteTitle = input.siteTitle.trim() || DEFAULT_SITE_TITLE;

  if (input.isNotFound) {
    return `${input.notFoundBrowserTitle} | ${siteTitle}`;
  }

  const featureTitle = input.featureTitle?.trim();

  if (!featureTitle || featureTitle === siteTitle) {
    return `${siteTitle} | Official Website`;
  }

  return `${featureTitle} | ${siteTitle}`;
}

export function buildBrowserDescription(input: {
  isNotFound: boolean;
  notFoundMetaDescription: string;
  siteMetaDescription: string;
  featureTitle: string | null | undefined;
  featureSummary: string | null | undefined;
}): string {
  if (input.isNotFound) {
    return truncateMetaDescription(input.notFoundMetaDescription);
  }

  if (!input.featureTitle && !input.featureSummary) {
    return input.siteMetaDescription;
  }

  const description = [input.featureTitle, input.featureSummary].filter(Boolean).join('. ');

  return truncateMetaDescription(description || input.siteMetaDescription);
}
