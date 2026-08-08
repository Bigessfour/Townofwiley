# Correctness-surface passes

Per-surface evaluation against **documentation** + **automated proof**.
Allowlist: [function-inventory.generated.md](./function-inventory.generated.md) · Tracking: [action-items.md](./action-items.md).

## Waves

| Wave | PR theme | Status |
| --- | --- | --- |
| 1 | Setup + auth foundation + verify already-proven | **In progress / this PR** |
| 2 | Record-editor save + meeting upload publish | Pending |
| 3 | P2/P3 behavior upgrades | Pending |

### Pass criteria

| Gate | Pass when |
| --- | --- |
| Docs | Behavior matches cited doc (or doc updated same change) |
| Behavior unit | Vitest/Karma exercises logic (not only `Component.name`) |
| E2E completeness | Playwright asserts the docs outcome |
| W1 bar | Docs cited + green tests + existing e2e/ops; write mutations may still be Wave 2 |

---

## Surface register

| Surface | Docs | Behavior unit | E2E / ops | Wave | Gaps |
| --- | --- | --- | --- | --- | --- |
| `StaffAuthService` | [CLERK-CMS-GUIDE](./CLERK-CMS-GUIDE.md) login | `staff-auth.service.vitest.ts` | `admin.cms.spec.ts` | W1 ✓ | — |
| `AdminLoginComponent` | same + `/admin/login` | `admin-login.component.vitest.ts` (returnUrl) | login fields + forgot | W1 ✓ | — |
| `CmsGenericModelAdminService` | [CMS-MODEL-ROUTE-MATRIX](./CMS-MODEL-ROUTE-MATRIX.md) | vitest | via editor | W1 ✓ | Deeper save e2e in W2 |
| `CmsClerkRecordEditorComponent` | Edit content → save | symbol smoke | opens editor | W1 partial | **W2: mocked save** |
| `CmsMeetingDocumentUploadComponent` | Upload agenda | symbol smoke | panel visible | W1 partial | **W2: mocked publish** |
| `CmsPublicDocumentAdminService` | documents | related specs | documents smoke | W1 ✓ | Share fixtures in W2 |
| `CommunityCalendarService` | meetings/community | vitest | `community-calendar.spec.ts` | W1 ✓ | — |
| `CommunityCalendarAdminService` | admin calendar | vitest | calendar admin vitest | W1 ✓ | — |
| Calendar `app.py` | calendar ops | `test_app.py` | ops curl | W1 ✓ | — |
| `LocalizedCmsContentStore` | CMS architecture | spec | public smoke | W1 ✓ | — |
| `CmsCommunityCalendarAdminComponent` | clerk calendar | symbol + services | — | W1 ✓ | Optional approve e2e later |
| `DocumentUploadService` | uploads | specs | panel e2e | W1 ✓ | Share fixtures in W2 |
| `PayBillPageComponent` | pay-bill | spec | payments smoke | W1 ✓ | — |
| `CmsAdmin` | task hub shell | vitest | admin hub e2e | W1 ✓ | W3 polish optional |
| `CmsClerkTaskHubComponent` | task cards | vitest | hub e2e | W1 ✓ | W3 behavior assert |
| `MeetingDocumentsArchiveComponent` | meetings docs | symbol | feature/docs e2e | W1 ✓ | W3 behavior |
| `ThisWeekInWileyComponent` | this week | symbol | calendar e2e | W1 ✓ | W3 behavior |
| `WeatherAlertBannerComponent` | weather banner | symbol | weather e2e | W1 ✓ | W3 behavior |
| `GoogleAnalyticsService` | GA4 SPA | vitest | — | W1 ✓ | — |
| `amplify-config` | runtime/CMS | `runtime-config.vitest.ts` | — | W1 ✓ | Fixed stale AppSync URL expect |

**Wave 1 date:** 2026-08-08

---

## Wave 2 / 3 backlog

1. Record editor **save** — e2e fill+save with mocked AppSync  
2. Meeting upload **publish** — e2e with mocked presign  
3. P3 symbol → one real behavior assert each  

Suggest `/code-review` after Wave 1 (auth) and Wave 2 (writes).
