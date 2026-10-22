/** Scroll to a hash target after the current paint (lazy route content). */
export function scheduleFragmentScroll(fragment: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.setTimeout(() => {
    scrollToFragment(fragment);
  }, 0);
}

/**
 * Weather signup may render after runtime config resolves; retry so the anchor exists before scrolling.
 */
export function scheduleFragmentScrollWithRetry(fragment: string, maxAttempts = 12): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  let attempts = 0;

  const attempt = () => {
    attempts += 1;
    const target = document.querySelector<HTMLElement>(fragment);
    if (target) {
      scrollToFragment(fragment);
      return;
    }
    if (attempts < maxAttempts) {
      window.setTimeout(attempt, 100);
    }
  };

  window.setTimeout(attempt, 0);
}

export function scrollToFragment(fragment: string, fallbackFragment?: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const target =
    document.querySelector<HTMLElement>(fragment) ??
    (fallbackFragment ? document.querySelector<HTMLElement>(fallbackFragment) : null);

  if (!target) {
    return;
  }

  const targetId = target.getAttribute('id');

  if (typeof window !== 'undefined' && targetId) {
    const nextUrl = `${window.location.pathname}${window.location.search}#${targetId}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1');
  }

  queueMicrotask(() => {
    target.focus({ preventScroll: true });
  });
}
