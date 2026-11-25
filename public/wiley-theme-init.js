/* Apply .wiley-dark before first paint. Keep in sync with resolveColorScheme in src/app/site-theme.ts. */
(function () {
  var stored = null;
  try {
    stored = localStorage.getItem('tow-color-scheme');
  } catch {
    stored = null;
  }

  var prefersDark =
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var dark = stored === 'dark' || (stored !== 'light' && prefersDark);
  document.documentElement.classList.toggle('wiley-dark', dark);

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', dark ? '#061f18' : '#0f3d2e');
  }
})();
