/**
 * Ensures style-src includes 'unsafe-inline' for local `ng serve` parity with Amplify Hosting.
 * Production customHttp.yml must already include style-src 'unsafe-inline' (SSR + hydration).
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
