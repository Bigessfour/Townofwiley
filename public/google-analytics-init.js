/**
 * Loads gtag.js after DOM parse from a same-origin file so the Angular service worker
 * does not prefetch https://www.googletagmanager.com/... during install (SW fetch()
 * is evaluated against connect-src; see Angular issue #35491).
 *
 * CSP must follow Google Tag Platform GA4 guidance (customHttp.yml), including
 * script-src / connect-src / img-src / frame-src for googletagmanager + analytics hosts.
 *
 * Automatic page_view is disabled here. `GoogleAnalyticsService` sends explicit
 * page_view events on Angular NavigationEnd so SPA route changes are measured.
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
    // send_page_view: false — Angular router will send explicit page_view events
    // on NavigationEnd so SPA route changes are measured correctly.
    gtag('config', 'G-HS0707W6BF', {
      send_page_view: false,
    });
  };
  document.head.appendChild(s);
})();
