# PrimeNG surface inventory (Town of Wiley)

Component list from templates under `src/app/`. Expectations reference [PrimeNG](https://primeng.dev). **Hello-from / guestbook** was removed July 2026 (deprecated).

## Site shell (public routes with full chrome)

| Route context | PrimeNG components | Notes |
|---------------|-------------------|--------|
| [`app.html`](../src/app/app.html) | Toast, Card, MegaMenu, Drawer, Tag, Divider, Skeleton, Timeline, Avatar, Button, InputText | MegaMenu: custom `#start` / `#item` / `#end` + `routerLink` leaves. Search: reactive `siteSearchForm` + `pInputText`. CTAs: `pButton` + forest preset. |

## Public routes

| Route | Template | PrimeNG components | Forms |
|-------|----------|-------------------|--------|
| `/` | `app.html` | (shell) | Site search `FormGroup` |
| `/notices` | `notices-page.html` | Card, Skeleton | — |
| `/meetings` | `meetings-page.html`, `meeting-documents-archive` | Card, Table, Button, Skeleton | — |
| `/weather` | `localized-weather-panel.html`, `weather-alert-banner` | Card, Panel, Tag, Accordion, Select, Message, Button, InputText, Skeleton | Alert signup: reactive `alertSignupForm` + `p-message` |
| `/services` | `resident-services.html`, `panels/*` | Toast, Card, Select, Message, Button, InputText, Textarea | Issue report: reactive `issueForm` |
| `/businesses` | `business-directory.html` | IconField, InputIcon, InputText, Button | Directory search: `FormControl`; call / website: `pButton` |
| `/pay-bill` | `pay-bill-page`, `pay-instructions` | Message, Card, Button | External Paystar CTA only (`pButton`) |
| `/news` | `news.html` | Card, Skeleton, Button | External / PDF CTAs: `pButton` outlined |
| `/contact` | `contact-page.html` | Card, Panel, Skeleton | — |
| `/accessibility` | `accessibility-page`, `accessibility-support` | Card, Message, InputText, Textarea | Barrier report: reactive `reportForm` + `p-message` |
| `/privacy`, `/terms` | `privacy-page`, `terms-page` | Card | — |
| `/not-found` | `not-found` | Card | — |
| AI chat (embedded) | `localized-ai-chat.html` | Fieldset, Button, Panel, Chip, ScrollPanel, Card | — |

## Staff / admin routes

| Route | Template | PrimeNG components | Forms |
|-------|----------|-------------------|--------|
| `/admin/login` | `admin-login.component.html` | Message, Button | Cognito Hosted UI (no local form) |
| `/admin` hub | `cms-admin.html` | Button, Toast | — |
| Task hub | `cms-clerk-task-hub` | Tag, Button | — |
| Record editor | `cms-clerk-record-editor` | Button, Select, InputText, Textarea, InputNumber, Checkbox, Message, OrderList, Dialog | Dynamic fields via `ngModel` (metadata-driven); **accepted** for generic CRUD |
| Email aliases | `cms-email-alias-admin` | Table, Button, Message, InputText | Reactive `aliasForm` |
| Meeting doc upload | `cms-meeting-document-upload` | Message, FileUpload patterns | Upload flow |
| Clerk upload panel | `cms-clerk-upload-panel` | Message, Button | — |
| Site status / snapshot | `cms-site-status`, `cms-content-snapshot` | Button, Message, Card | — |
| Recent changes | `cms-recent-changes` | Table, Tag | — |
| Task guide | `cms-clerk-task-guide` | Card | — |

## Theme and buttons (2026)

- Preset: [`wiley-theme-preset.ts`](../src/app/wiley-theme-preset.ts) — forest primary, gold CTAs, megamenu/drawer tokens.
- Prefer **`pButton`** + preset severities on public and staff surfaces; legacy `.button-cta` remains only on `/not-found` until migrated.
- Reactive forms + **`p-message`** for resident-facing validation (weather, accessibility, services issue).

## Remaining low-priority gaps

| Area | Gap |
|------|-----|
| Record editor | Dynamic `ngModel` per field type — migrating to reactive would be a large refactor; keep until a form-generator rewrite. |
| Meetings Table | Custom column templates — verify sort API if server-side sort is added later. |
| Not-found page | `.button-cta` home / contact links — migrate to `pButton` when touched. |