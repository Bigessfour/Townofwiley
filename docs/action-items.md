# Town of Wiley — Function Inventory Action Items

**Generated inventory:** [function-inventory.generated.md](./function-inventory.generated.md)
**Surface passes:** [correctness-surface-passes.md](./correctness-surface-passes.md)
**Visual tree:** [function-tree.md](./function-tree.md)
**Config:** [`.function-inventory.json`](../.function-inventory.json)
**Scan command:** `npm run inventory`

**Waves (3 PRs):**
1. Setup + verify already-proven (this file + pass register + auth foundation)
2. Clerk write completeness (record-editor save + meeting upload publish)
3. P2/P3 behavior upgrades

---

## Wave tracker

- [x] **Wave 1** — Setup register; restore auth/contact-update foundation; verify + check off proven surfaces
- [ ] **Wave 2** — Record-editor save + meeting upload publish (mocked backends)
- [ ] **Wave 3** — P2/P3 symbol → behavior upgrades

---

## All 20 surfaces (checkbox = Wave bar met)

Legend: **W1** = docs cited + green unit + meaningful e2e/ops (may still need deeper write e2e in Wave 2).  
**W2 gap** = UI opens / symbol only until save/publish e2e lands.

### P1
- [x] `StaffAuthService` — W1: API restored; vitest green
- [x] `AdminLoginComponent` — W1: returnUrl sanitize; login e2e
- [x] `CmsGenericModelAdminService` — W1: vitest green (save path proved deeper in Wave 2)
- [ ] `CmsClerkRecordEditorComponent` — W2: save with mocked AppSync (open-editor e2e only today)
- [ ] `CmsMeetingDocumentUploadComponent` — W2: publish with mocked presign (panel e2e only today)
- [x] `CmsPublicDocumentAdminService` — W1: related specs (deeper with Wave 2 fixtures)
- [x] `CommunityCalendarService` — W1: vitest + calendar e2e
- [x] `CommunityCalendarAdminService` — W1: vitest
- [x] Calendar `app.py` — W1: `test_app.py`
- [x] `LocalizedCmsContentStore` — W1: spec + public smoke
- [x] `CmsCommunityCalendarAdminComponent` — W1: symbol + service/backend proof
- [x] `DocumentUploadService` — W1: specs (deeper with Wave 2)
- [x] `PayBillPageComponent` — W1: spec + payments smoke

### P2
- [x] `CmsAdmin` — W1: vitest + admin hub e2e
- [x] `CmsClerkTaskHubComponent` — W1: vitest + hub e2e (Wave 3 may add behavior asserts)

### P3
- [x] `MeetingDocumentsArchiveComponent` — W1: symbol + feature/docs e2e (Wave 3 behavior upgrade)
- [x] `ThisWeekInWileyComponent` — W1: symbol + calendar e2e (Wave 3 behavior upgrade)
- [x] `WeatherAlertBannerComponent` — W1: symbol + weather e2e (Wave 3 behavior upgrade)
- [x] `GoogleAnalyticsService` — W1: vitest
- [x] `amplify-config` — W1: runtime-config vitest (endpoint expectation aligned to current AppSync)

---

## Key workflows

- [x] Staff opens `/admin/login` (fields + forgot password)
- [x] Staff opens task hub
- [x] Staff opens in-app record editor via Edit content
- [x] Staff sees meeting upload panel on `#documents`
- [ ] Clerk completes **save** in record editor (mocked GraphQL) — Wave 2
- [ ] Clerk **publishes** meeting PDF (mocked presign) — Wave 2
- [x] Community calendar resident path

---

## Verification commands

```bash
npx vitest run src/app/auth src/app/cms-generic-model-admin.service.vitest.ts \
  src/app/community-calendar src/app/pay-bill src/app/google-analytics.service.vitest.ts \
  src/app/runtime-config.vitest.ts src/app/clerk-setup/contact-update-review.service.vitest.ts
/opt/homebrew/bin/python3.11 -m unittest discover -s infrastructure/community-calendar/tests -v
npm run test:e2e:smoke -- e2e/specs/smoke/admin.cms.spec.ts
npm run inventory
```

---

## Meta

- Prefer 3 PRs (waves), not 14. Pause after each wave.
- Suggest `/code-review` after Wave 1 (auth) and Wave 2 (writes).
