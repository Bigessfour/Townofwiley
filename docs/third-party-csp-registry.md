# Third-party Content-Security-Policy registry

**SSOT for allowed origins:** [`customHttp.yml`](../customHttp.yml) (synced to Amplify Hosting and `angular.json` dev server via `npm run sync:angular-serve-csp`).

**Workflow:** edit `customHttp.yml` only → `npm run verify:custom-http-yaml` → `npm run sync:angular-serve-csp` → `npm run amplify:sync-headers` → redeploy `main`.

See also: [AMPLIFY_HOSTING_SOT.md](./AMPLIFY_HOSTING_SOT.md) §3, [appsync-api-key-rotation-runbook.md](./appsync-api-key-rotation-runbook.md).

## Allowed third parties

| Vendor / service           | CSP directives                                      | Origins (summary)                                                                                       | Site feature                                                | Removable?                      |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------- |
| Town site (first-party)    | `default-src`, `base-uri`, `form-action`            | `'self'`                                                                                                | Core Angular app                                            | No                              |
| Angular service worker     | `worker-src`                                        | `'self'`                                                                                                | Offline shell / SW                                          | No                              |
| AWS AppSync (CMS read)     | `connect-src`                                       | `https://*.appsync-api.us-east-2.amazonaws.com`, `wss://*.appsync-realtime-api.us-east-2.amazonaws.com` | Public CMS content                                          | No                              |
| Amazon Cognito             | `connect-src`                                       | `cognito-idp`, `cognito-identity`, `cognito-sync` (`us-east-2`)                                         | Staff `/admin` auth (when signed in)                        | No                              |
| S3 documents buckets       | `connect-src`, `media-src`, `frame-src`             | `townofwiley-documents-storage*.s3.us-east-2.amazonaws.com`                                             | Document hub, newsletter PDF iframe                         | No                              |
| NOAA / NWS                 | `connect-src`                                       | `api.weather.gov`, `alerts.weather.gov`, `radar.weather.gov`                                            | Weather panel (browser fallback)                            | Only if proxy-only              |
| Lambda Function URLs       | `connect-src`                                       | `https://*.lambda-url.us-east-2.on.aws`                                                                 | NWS proxy, severe-weather signup, chat proxy, contact write | Per feature                     |
| API Gateway (staff review) | `connect-src`                                       | `https://*.execute-api.us-east-2.amazonaws.com`                                                         | `/admin#updates` contact review (JWT)                       | No while staff review live      |
| Google Analytics 4 / GTM   | `script-src`, `connect-src`, `img-src`, `frame-src` | `googletagmanager.com`, `google-analytics.com`, `google.com`, `g.doubleclick.net`, etc.                 | Analytics                                                   | Yes (remove GA init + CSP rows) |
| Easy-Peasy AI              | `script-src`, `connect-src`                         | `bots.easy-peasy.ai`, `wss://bots.easy-peasy.ai`                                                        | Chatbot embed / API                                         | Yes (disable in runtime config) |
| PrimeIcons / fonts         | `font-src`                                          | `'self'`, `data:`                                                                                       | Icon font (icomoon in CSS)                                  | No                              |
| Remote images              | `img-src`                                           | `'self'`, `data:`, `https:`                                                                             | CMS and external images                                     | Tighten only with audit         |

## Required `unsafe-inline` (cannot remove on static Amplify Gen1 today)

| Directive                        | Why it stays                                                                                                                        | Notes                                                                                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `script-src 'unsafe-inline'`     | GTM/gtag inject small inline bootstrap snippets after [`public/google-analytics-init.js`](../public/google-analytics-init.js) loads | Removing requires CSP nonces/hashes on every HTML response; Amplify static hosting does not inject nonces. See [Google Tag Platform CSP guide](https://developers.google.com/tag-platform/security/guides/csp). |
| `style-src 'unsafe-inline'`      | Angular SSR/prerender inlines CSS in `<style>` tags; hydration injects component styles                                             | Required on Amplify static hosting (no per-response nonces). External `styles-*.css` is not sufficient alone.                                                                                                   |
| `style-src-attr 'unsafe-inline'` | Angular emulated encapsulation and PrimeNG set `style=""` on components                                                             | Separate from `style-src`; both are required for full styling.                                                                                                                                                  |

We do **not** duplicate CSP in `index.html` meta tags or `amplify.yml` `customHeaders`.

## Service worker and stale CSP (operators)

After changing `Content-Security-Policy` in [`customHttp.yml`](../customHttp.yml), run `npm run amplify:sync-headers` and redeploy `main` so CloudFront serves the new header on network responses.

Some browsers may still show **“Applying inline style violates…”** with sha256 hashes when:

1. **Angular service worker** cached an older `index.html` `Response` (including its headers) from before `style-src 'unsafe-inline'` was restored. [`ngsw-config.json`](../ngsw-config.json) prefetches `/index.html`.
2. **Third-party iframes** (GTM, chatbot) log violations in DevTools while the top-level document policy is correct.

**Clear client drift:**

1. DevTools → **Application** → **Service Workers** → unregister for `townofwiley.gov`, or enable **Update on reload** once.
2. **Network** → load `/` → select the **document** → **Response Headers** → confirm:
   `style-src 'self' 'unsafe-inline'; style-src-attr 'unsafe-inline'`
3. Hard reload with cache disabled once.

If the document response headers match the repo but violations persist only until step 1, the issue was a stale SW cache—not the live Amplify policy.

**Do not** fix inline `<style>` blocks by adding `'unsafe-inline'` only to `style-src-attr`; that allows `style=""` attributes but still blocks SSR/hydration `<style>` tags (see `style-src` vs `style-src-attr` in CSP Level 3).

## Verification

| Check                                 | Command                                           |
| ------------------------------------- | ------------------------------------------------- |
| Repo YAML + angular parity            | `npm run verify:custom-http-yaml`                 |
| Inline `<style>` regression guard     | `npm run test:csp-inline-style-policy`            |
| Live token baseline                   | `npm run verify:live-csp-probe`                   |
| Live exact match                      | `npm run verify:live-csp-vs-repo`                 |
| Homepage violations (local serve CSP) | `npm run test:e2e:smoke` → `csp-homepage.spec.ts` |
| Live homepage inline-style console    | `npm run test:e2e:live:csp-inline-style`          |
| Scheduled prod probe                  | GitHub Actions `hosting-headers-drift-watch.yml`  |

When adding a vendor, update **this table** and `customHttp.yml` in the same PR.
