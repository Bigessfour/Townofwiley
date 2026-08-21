# Town of Wiley — Function Inventory Action Items

**Generated inventory:** [function-inventory.generated.md](./function-inventory.generated.md)
**Surface passes:** [correctness-surface-passes.md](./correctness-surface-passes.md)
**Visual tree:** [function-tree.md](./function-tree.md)
**Config:** [`.function-inventory.json`](../.function-inventory.json)
**Scan command:** `npm run inventory`

**Waves:** combined **Wave 1+2** in one PR (fewer CI runs); Wave 3 optional later.

---

## Wave tracker

- [x] **Wave 1** — Setup register; auth foundation; verify already-proven
- [x] **Wave 2** — Record-editor save + meeting upload publish (mocked backends)
- [ ] **Wave 3** — P2/P3 symbol → behavior upgrades (optional)

---

## All 20 surfaces

### P1
- [x] `StaffAuthService`
- [x] `AdminLoginComponent` (returnUrl sanitize + encoded `//` blocked)
- [x] `CmsGenericModelAdminService`
- [x] `CmsClerkRecordEditorComponent` — e2e mocked AppSync **save**
- [x] `CmsMeetingDocumentUploadComponent` — e2e mocked presign **publish**
- [x] `CmsPublicDocumentAdminService`
- [x] `CommunityCalendarService`
- [x] `CommunityCalendarAdminService`
- [x] Calendar `app.py`
- [x] `LocalizedCmsContentStore`
- [x] `CmsCommunityCalendarAdminComponent`
- [x] `DocumentUploadService`
- [x] `PayBillPageComponent`

### P2 / P3
- [x] `CmsAdmin` / task hub (W1 bar)
- [x] `CmsContactPageChooserComponent` (Contact page section chooser; e2e `admin.cms.spec.ts`)
- [x] Meeting archive / This week / Weather banner / GA / amplify-config (W1 bar; Wave 3 for deeper behavior)

---

## Key workflows

- [x] Staff login UI + forgot password
- [x] Task hub + open record editor
- [x] Clerk **saves** notice (mocked GraphQL)
- [x] Meeting upload panel + **publish** PDF (mocked media + GraphQL)
- [x] Community calendar resident path

---

## Verification

```bash
npx vitest run src/app/auth src/app/cms-admin/cms-clerk-sensitive-save.vitest.ts \
  src/app/cms-generic-model-admin.service.vitest.ts src/app/runtime-config.vitest.ts
npm run test:e2e:smoke -- e2e/specs/smoke/admin.cms.spec.ts
npm run inventory
```
