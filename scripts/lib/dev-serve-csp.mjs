/**
 * Production CSP (customHttp.yml) uses style-src 'self' only — bundled CSS on Amplify.
 * `ng serve` + Vite inject component styles via inline <style> tags; without
 * 'unsafe-inline' on style-src, lazy routes (e.g. /admin) throw during injectStyles.
 */
export function applyDevServeCspRelaxedStyles(csp) {
  if (!csp.includes("style-src 'self'")) {
    throw new Error("CSP missing expected style-src 'self' baseline");
  }
  if (csp.includes("style-src 'self' 'unsafe-inline'")) {
    return csp;
  }
  return csp.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'");
}
