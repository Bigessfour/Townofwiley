/**
 * Loads gtag.js after DOM parse from a same-origin file so the Angular service worker
 * does not prefetch https://www.googletagmanager.com/... during install (SW fetch()
 * is evaluated against connect-src; see Angular issue #35491).
 *
 * CSP must follow Google Tag Platform GA4 guidance (customHttp.yml), including
 * script-src / connect-src / img-src / frame-src for googletagmanager + analytics hosts.
 *
 * @see https://developers.google.com/tag-platform/security/guides/csp
 * @see https://github.com/angular/angular/issues/35491
 */
(function () {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-HS0707W6BF';
  s.onload = function () {
    gtag('js', new Date());
    gtag('config', 'G-HS0707W6BF');
  };
  document.head.appendChild(s);
})();
