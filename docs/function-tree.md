# Town of Wiley — Function Tree

**Auto-generated raw data:** [function-inventory.generated.md](./function-inventory.generated.md)
**Status overlay:** [action-items.md](./action-items.md)

```mermaid
flowchart TB
  Resident((Resident))
  Clerk((Town Clerk))

  subgraph Public["Public site"]
    Meetings["/meetings\nMeetingsPage + CommunityCalendarPanel"]
    Home["/\nThisWeekInWiley"]
    Pay["/pay-bill"]
    Contact["/contact"]
  end

  subgraph Calendar["Community calendar"]
    Runtime["runtime-config.js\ncommunityCalendar.apiEndpoint"]
    Svc["CommunityCalendarService"]
    AdminSvc["CommunityCalendarAdminService"]
    Lambda["TownOfWileyCommunityCalendar\nFunction URL"]
    DDB["TownOfWileyCommunityEvents"]
  end

  subgraph Staff["/admin"]
    Hub["CmsClerkTaskHub"]
    CalAdmin["CmsCommunityCalendarAdmin"]
  end

  Resident --> Meetings
  Resident --> Home
  Meetings --> Svc
  Home --> Svc
  Svc --> Runtime --> Lambda
  Lambda --> DDB
  Clerk --> Hub --> CalAdmin --> AdminSvc --> Lambda
```

## Community calendar proof map

```mermaid
flowchart LR
  Unit[Vitest suites] --> Svc[CommunityCalendarService]
  Unit --> Admin[AdminService]
  Unit --> Links[calendar links]
  E2E[e2e smoke community-calendar] --> Panel[CommunityCalendarPanel]
  Ops[Live curl /health + form] --> Lambda[Function URL]
  Backend[test_app.py] --> Lambda
```

## How to refresh

```bash
npm run inventory
```

See [action-items.md](./action-items.md) for verification evidence and backlog.
