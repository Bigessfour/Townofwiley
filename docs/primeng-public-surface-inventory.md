# PrimeNG public surface inventory (Town of Wiley)

Generated for the forest theme + MegaMenu alignment PR. Component list is from templates under `src/app/`. Doc expectations reference [PrimeNG](https://primeng.dev) via the **primeng MCP** (`get_component_sections`, `get_example`).

## Site shell (all public routes)

| Route context | PrimeNG components | Notes vs PrimeNG docs |
|---------------|-------------------|------------------------|
| [`app.html`](../src/app/app.html) | Toast, Card, MegaMenu, Drawer, Tag, Divider, Skeleton, Timeline, Avatar | **MegaMenu:** aligned in this PR (column/group labels, `p-megamenu-grid`, leaf `routerLink`). **Drawer:** mobile nav overlay — verify `modal` + `dismissible` per Drawer docs. **Timeline:** homepage notices — confirm `value` shape matches Timeline API. |

## Per-route inventory

| Public route | Template | PrimeNG components |
|--------------|----------|------------------|
| `/` (home) | `app.html` | (shell above) |
| `/notices` | `notices-page.html` | Card, Skeleton |
| `/meetings` | `meetings-page.html`, `meeting-documents-archive.component.html` | Card, Table, Button, Skeleton |
| `/weather` | `localized-weather-panel.html`, `weather-alert-banner` | Card, Panel, Tag, Accordion, Select, Message, Button, Skeleton |
| `/services` | `resident-services.html`, `panels/*` | Toast, Card, Select, Message, Button |
| `/businesses` | `business-directory.html` | IconField, InputIcon, InputText (native input inside) |
| `/pay-bill` | `pay-bill-page`, `pay-instructions` | Message, Card |
| `/news` | `news.html` | Card, Skeleton |
| `/contact` | `contact-page.html` | Card, Panel, Skeleton |
| `/accessibility` | `accessibility-page.html`, `accessibility-support.html` | Card, Message, InputText, Textarea |
| `/privacy`, `/terms` | `privacy-page.html`, `terms-page.html` | Card |
| `/not-found` | `not-found` | Card |
| AI chat (embedded) | `localized-ai-chat.html` | Fieldset, Button, Panel, Chip, ScrollPanel, Card |

Staff-only (`/admin`, `/admin/login`, clerk tools) use additional Table, Dialog, OrderList, InputNumber, Checkbox — out of scope for resident-facing alignment.

## MegaMenu (fixed in this PR)

PrimeNG **Basic** + **Router** examples require:

1. Root `items`: `MegaMenuItem[][]` (columns).
2. Each column: array of **groups** `{ label?, items: leaf[] }`.
3. Leaves: `routerLink` / `url` / `command` on innermost items.
4. Horizontal custom chrome: **Template** example uses `#start`, `#item` with `item.root`, `#end`.

**Changes applied:**

- Labeled flyout groups (Government, Services second column).
- Removed custom 2-column CSS grid on `.p-megamenu-submenu`; style `.p-megamenu-grid` instead.
- Submenu leaves use `[routerLink]` + `[fragment]` (Router example).
- `megaMenuColumn()` documents Prime `MenuItem[][]` typing vs flat leaf runtime.

## Remaining gaps (follow-up)

| Component | Where | PrimeNG expectation | Gap |
|-----------|-------|---------------------|-----|
| Card | Most public pages | Prefer `[pt]` or theme tokens; optional header/footer templates | Heavy `styleClass` + global SCSS overrides — acceptable but not preset-first. |
| Table | `/meetings` | Sort/paginate APIs documented per Table | Custom calendar table — verify `pTemplate` columns match Table doc patterns. |
| Select | Weather, services | `optionLabel` / `optionValue` + form binding | Confirm reactive forms match Select “filled/outlined” guidance. |
| Accordion | Weather alerts | `value` / multiple panel API (v21+) | Audit accordion panel `value` indices for a11y. |
| IconField | Businesses | Wrap InputText per IconField doc | Uses native `<input>` — consider `pInputText` inside IconField for PT consistency. |
| Message | Pay bill, services | `severity` + optional icon | Text-only bindings — OK per Message basic. |
| Toast | App, services | `MessageService` + key | Two toast hosts (global + services key) — intentional. |

## MCP commands used

```text
get_component_sections({ component: "megamenu" })
get_example({ component: "megamenu", section: "basic", variant: "typescript" })
get_example({ component: "megamenu", section: "router", variant: "typescript" })
```