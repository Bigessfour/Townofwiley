# Town of Wiley — Function Tree

**Auto-generated surfaces:** [function-inventory.generated.md](./function-inventory.generated.md)
**Status overlay:** [action-items.md](./action-items.md)
**Per-surface passes:** [correctness-surface-passes.md](./correctness-surface-passes.md)
**Allowlist:** [`.function-inventory.json`](../.function-inventory.json) (`tracking_mode: surfaces`)

```mermaid
flowchart TB
  Resident((Resident))
  Clerk((Town Clerk))

  subgraph Public["Public site P1"]
    Meetings["/meetings + CommunityCalendar"]
    Pay["/pay-bill"]
    CmsRead["LocalizedCmsContentStore"]
  end

  subgraph Calendar["Community calendar"]
    Svc["CommunityCalendarService"]
    AdminSvc["CommunityCalendarAdminService"]
    Lambda["app.py Function URL"]
  end

  subgraph Staff["/admin P1 write path"]
    Login["AdminLogin + StaffAuth"]
    Hub["CmsClerkTaskHub"]
    Editor["CmsClerkRecordEditor"]
    Generic["CmsGenericModelAdminService"]
    Upload["MeetingDocumentUpload"]
  end

  Resident --> Meetings --> Svc --> Lambda
  Resident --> Pay
  Resident --> CmsRead
  Clerk --> Login --> Hub --> Editor --> Generic
  Hub --> Upload
  Hub --> AdminSvc --> Lambda
```

## How to refresh

```bash
npm run inventory
```

See [action-items.md](./action-items.md) for P1 verification evidence.
