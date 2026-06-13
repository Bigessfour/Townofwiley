# Town Document Publishing Guide

**Use [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) for all public document publishing.** This page is a short pointer so older links still land in the right place.

## Where meeting documents live (2026)

- **Clerk path:** `/admin` → **Document publishing** → **Upload a meeting agenda or packet** (creates `PublicDocument` rows linked to `Event` records).
- **Resident page:** [https://townofwiley.gov/meetings](https://townofwiley.gov/meetings) — agendas and approved minutes archive (`sectionId: meeting-documents` only).
- **Legacy URLs:** `/documents` redirects to `/meetings`; `/records` redirects to `/contact`.

The public site **ignores** other `PublicDocument` section IDs (budget, ordinances, FOIA guides, etc.). Residents email **clerk@townofwiley.gov** from `/contact` or `/permits` for other document requests.

## Quick checklist (meeting PDFs)

1. On `/admin`, create the **Event** first (**Add meeting or event**).
2. Use **Upload a meeting agenda or packet** — select the meeting, upload the PDF, **Upload and publish**.
3. Hard-refresh `/meetings` and confirm **View agenda** and the searchable archive.

For manual IT fallback, see [CMS_MEETING_AGENDA.md](./CMS_MEETING_AGENDA.md) (`PublicDocument` in AppSync Queries).

## More detail

- [CMS_MEETING_AGENDA.md](./CMS_MEETING_AGENDA.md) — link agenda PDFs to `/meetings` rows via `/admin`
- [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) — PublicDocument fields, bilingual copy
- [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md) — post-edit verification
