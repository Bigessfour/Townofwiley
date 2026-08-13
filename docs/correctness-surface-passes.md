# Correctness-surface passes

Allowlist: [function-inventory.generated.md](./function-inventory.generated.md) · Tracking: [action-items.md](./action-items.md).

## Waves

| Wave | Theme | Status |
| --- | --- | --- |
| 1 | Setup + auth foundation + verify already-proven | Done (same PR as Wave 2) |
| 2 | Record-editor save + meeting upload publish | Done |
| 3 | P2/P3 behavior upgrades | Optional / pending |

### Pass criteria

| Gate | Pass when |
| --- | --- |
| Docs | Matches cited guide (or doc updated) |
| Behavior unit | Vitest exercises logic |
| E2E completeness | Playwright asserts docs outcome |

---

## Surface register (2026-08-08)

| Surface | Docs | Behavior unit | E2E / ops | Status |
| --- | --- | --- | --- | --- |
| `StaffAuthService` | CLERK login | vitest | login page | ✓ W1 |
| `AdminLoginComponent` | `/admin/login` | returnUrl vitest | fields + forgot | ✓ W1 |
| `CmsGenericModelAdminService` | CMS matrix | vitest | via save e2e | ✓ W1/W2 |
| `CmsClerkRecordEditorComponent` | Edit → save | sensitive-save vitest | **mocked create save** | ✓ W2 |
| `CmsMeetingDocumentUploadComponent` | Upload agenda | sensitive-save vitest | **mocked publish** | ✓ W2 |
| `CmsPublicDocumentAdminService` | documents | specs | publish e2e | ✓ W2 |
| `DocumentUploadService` | uploads | specs | presign mock e2e | ✓ W2 |
| Calendar services + `app.py` | meetings | vitest / test_app | calendar e2e | ✓ W1 |
| `LocalizedCmsContentStore` | CMS arch | spec | public smoke | ✓ W1 |
| `CmsCommunityCalendarAdminComponent` | clerk cal | symbol + services | — | ✓ W1 |
| `PayBillPageComponent` | pay-bill | spec | payments smoke | ✓ W1 |
| `CmsAdmin` / task hub | hub | vitest | hub e2e | ✓ W1 |
| Meeting archive / This week / Weather | feature pages | symbol | feature e2e | ✓ W1 (W3 optional) |
| GA / `amplify-config` | runtime | vitest | — | ✓ W1 |

---

## Wave 2 evidence

- `e2e/support/clerk-write-mocks.ts` — AppSync GraphQL + `/mock-media-upload` + meeting event in snapshot
- `admin.cms.spec.ts` — save notice; publish PDF with confirm dialog
- Review fixes: encoded `returnUrl` rejection; `refreshSession` defaults `forceRefresh: true`
