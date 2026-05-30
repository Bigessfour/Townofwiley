# Town of Wiley — Design System

Light-theme tokens for the official site: **deep navy + teal** (primary), **sage + earth** (secondary), **gold + cream** (accents). Typography: **Fraunces** (headings) and **Source Sans 3** (body).

## Token sources

| Layer | File |
|-------|------|
| Canonical hex | [`src/styles/_wiley-tokens.scss`](../src/styles/_wiley-tokens.scss) |
| Legacy aliases + components | [`src/styles.scss`](../src/styles.scss) |
| Tailwind utilities | [`src/tailwind.css`](../src/tailwind.css) (`@theme`) |
| PrimeNG | [`src/app/wiley-theme-preset.ts`](../src/app/wiley-theme-preset.ts) |

## Tailwind examples

- **Header:** `sticky top-0 z-50 border-b border-wiley-cream-100/80 bg-wiley-cream-0/95 backdrop-blur-md shadow-wiley-card`
- **Primary button:** `inline-flex min-h-11 items-center justify-center rounded-wiley-full bg-wiley-teal-600 px-5 font-sans text-sm font-bold text-wiley-inverse hover:bg-wiley-teal-700`
- **Card:** `rounded-wiley-xl border border-wiley-cream-100 bg-wiley-cream-0 p-wiley-md shadow-wiley-card`
- **Hero inner:** `relative z-10 flex min-h-[32.5rem] flex-col items-center justify-center gap-4 px-5 text-center font-display text-wiley-inverse`

## Hero image

```bash
npm run assets:hero
npm run assets:hero -- --input Photos/wiley02.webp
```

Outputs `public/hero-wiley.webp` and `public/hero-wiley-800.webp`.

## Site-wide layout

Shared SCSS: [`src/styles/_wiley-layout.scss`](../src/styles/_wiley-layout.scss) (imported from `styles.scss`).

| Class | Use |
|-------|-----|
| `.wiley-page-shell` | News, businesses, document hub, CMS admin — left-aligned grid shell |
| `.feature-detail-stack` | Routed feature pages inside `App` |
| `.wiley-page-header` | Kicker + `h1` block inside panels |
| `.panel.wiley-panel` | PrimeNG cards and static panels |
| `.site-footer` | Global footer (contrast + alignment) |
| `.document-hub-site-bar` | `/documents` mini header |

Post-release verification: [`post-deploy-checklist.md`](./post-deploy-checklist.md).

## When to use sage vs teal

- **Teal:** primary actions, links, focus rings, form focus borders.
- **Sage:** secondary buttons, soft section backgrounds, informational notices.
- **Gold:** focus accents on header controls, badges (not small body text on cream).
