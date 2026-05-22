import type { RuntimePaystarConfig } from './paystar-config';

export interface QuickPayHrefState {
  href: string | null;
  isPlaceholder: boolean;
  disabled: boolean;
}

/**
 * Resolves the hosted Paystar portal link for resident-facing CTAs.
 * Never returns a synthetic placeholder URL — missing config disables the CTA instead.
 */
export function resolveQuickPayHref(config: RuntimePaystarConfig): QuickPayHrefState {
  if (config.mode === 'none') {
    return { href: null, isPlaceholder: false, disabled: true };
  }

  const url = config.portalUrl.trim();
  if (url) {
    return { href: url, isPlaceholder: false, disabled: false };
  }

  return { href: null, isPlaceholder: true, disabled: true };
}
