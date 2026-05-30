/**
 * Guards against CSP regressions that block Angular SSR/hydration <style> tags while
 * allowing style="" attributes only via style-src-attr (commit d22973b pattern).
 *
 * @see docs/third-party-csp-registry.md
 */

/**
 * @param {string} csp
 * @param {string} directiveName e.g. style-src, style-src-attr
 * @returns {string[] | null} source tokens, or null if directive absent
 */
export function parseCspDirectiveSources(csp, directiveName) {
  const re = new RegExp(`${directiveName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([^;]+)`, 'i');
  const match = csp.match(re);
  if (!match) {
    return null;
  }
  return match[1].trim().split(/\s+/).filter(Boolean);
}

/**
 * @param {string[] | null} sources
 * @param {string} token e.g. 'unsafe-inline' (without quotes)
 */
export function cspSourcesIncludeQuotedToken(sources, token) {
  if (!sources) {
    return false;
  }
  const quoted = `'${token}'`;
  return sources.includes(quoted) || sources.includes(token);
}

/**
 * Detects the exact hosting regression: style-src-attr has 'unsafe-inline' but style-src does not.
 * That blocks <style> elements and produces console errors with sha256 hashes of blocked CSS.
 *
 * @param {string} csp
 */
export function hasInlineStyleElementRegression(csp) {
  const styleSrc = parseCspDirectiveSources(csp, 'style-src');
  const styleSrcAttr = parseCspDirectiveSources(csp, 'style-src-attr');
  const attrAllowsInline = cspSourcesIncludeQuotedToken(styleSrcAttr, 'unsafe-inline');
  const elemAllowsInline = cspSourcesIncludeQuotedToken(styleSrc, 'unsafe-inline');
  return Boolean(styleSrc && attrAllowsInline && !elemAllowsInline);
}

/**
 * @param {string} csp
 * @param {string} [label]
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateAngularInlineStylePolicy(csp, label = 'CSP') {
  if (hasInlineStyleElementRegression(csp)) {
    return {
      ok: false,
      message:
        `${label}: style-src-attr includes 'unsafe-inline' but style-src does not — ` +
        `this is the d22973b regression. Angular SSR/prerender and hydration inject <style> tags ` +
        `governed by style-src, not style-src-attr. Browsers will log "Applying inline style violates…" ` +
        `with sha256 hashes. Fix: add style-src 'self' 'unsafe-inline' in customHttp.yml, then ` +
        `npm run sync:angular-serve-csp && npm run amplify:sync-headers.`,
    };
  }

  const styleSrc = parseCspDirectiveSources(csp, 'style-src');
  if (!cspSourcesIncludeQuotedToken(styleSrc, 'unsafe-inline')) {
    return {
      ok: false,
      message:
        `${label}: style-src must include 'unsafe-inline' (Angular <style> tags from SSR/hydration).`,
    };
  }

  const styleSrcAttr = parseCspDirectiveSources(csp, 'style-src-attr');
  if (!cspSourcesIncludeQuotedToken(styleSrcAttr, 'unsafe-inline')) {
    return {
      ok: false,
      message:
        `${label}: style-src-attr must include 'unsafe-inline' (Angular/PrimeNG style="" attributes).`,
    };
  }

  return { ok: true };
}

/**
 * @param {string} csp
 * @param {string} [label]
 */
export function assertAngularInlineStylePolicy(csp, label = 'CSP') {
  const result = validateAngularInlineStylePolicy(csp, label);
  if (!result.ok) {
    throw new Error(result.message);
  }
}

/** Minimal broken policy from commit d22973b (regression fixture). */
export const CSP_INLINE_STYLE_REGRESSION_FIXTURE =
  "default-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; script-src 'self'";

/** Required style directives for Town of Wiley Angular hosting. */
export const CSP_INLINE_STYLE_VALID_FIXTURE =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; style-src-attr 'unsafe-inline'; script-src 'self'";
