# Meeting agenda PDF (clerk procedure)

The `/meetings` page shows upcoming `Event` rows from the CMS. When a meeting has a
linked agenda PDF, residents click **View agenda** and the PDF opens in a new tab.
When no PDF is linked yet, the same button shows a short message that the agenda is
not yet available.

The data flow:

1. An `Event` record defines the meeting (title, start, location, active).
2. The agenda PDF lives in Town document storage under `documents/meeting-documents/`.
3. A `PublicDocument` row with `sectionId: meeting-documents` and keyword
   `event:<event-uuid>` links the PDF to that meeting.
4. The public site resolves the storage `href` to a presigned S3 URL at click time
   (same pattern as newsletter PDFs on `/news`).

## Publishing an agenda for a council meeting

**Clerk path (preferred):**

1. `/admin` → **Add meeting or event** → **Edit content** → create or update the
   `Event` (title, start date/time, active on) → **Save to website**.
2. `/admin` → scroll to **Document publishing** → **Upload a meeting agenda or packet**.
3. Choose the meeting from the dropdown, select the PDF, click **Upload and publish**.
4. Hard-refresh `https://townofwiley.gov/meetings` and click **View agenda** on that
   row. The PDF should open in a new tab.
5. Confirm the file also appears under **Meeting documents & agendas** on
   `https://townofwiley.gov/documents`.

**IT path (fallback):**

1. Upload the PDF to S3, e.g.
   `documents/meeting-documents/2026-07-14-city-council-agenda.pdf`.
2. Create or update a `PublicDocument` in AppSync / Data Manager:
   - `sectionId`: `meeting-documents`
   - `href`: storage key or `storage:` + key
   - `keywords`: must include `event:<Event.id>` (exact UUID from the Event row)
   - `active`: `true`
3. Regenerate the public CMS snapshot and upload to static hosting:
   ```bash
   npm run generate:cms-snapshot
   ```
4. Verify on `/meetings` as above.

## Replacing or correcting an agenda

Uploading a new PDF for the same meeting creates a second `PublicDocument`. The site
uses the **newest** linked row for that `event:` id. To avoid confusion:

- Set `active: false` on older/wrong rows (e.g. minutes uploaded by mistake).
- Use a clear filename such as `2026-07-14-city-council-agenda.pdf`.

## Public behavior summary

| CMS state | `/meetings` button | On click |
|-----------|-------------------|----------|
| Linked PDF | **View agenda** | Opens that meeting's PDF in a new tab |
| No linked PDF | **View agenda PDFs** | Toast: agenda not yet available; no navigation |

The documents hub (`/documents`) still lists all `meeting-documents` files. The
**View Agenda Packet** featured block opens the next upcoming meeting's linked PDF
when one exists; otherwise it links to `/meetings`.

## Schema reference

- `Event` — meeting calendar rows (`title`, `start`, `end`, `location`, `active`).
- `PublicDocument` — downloadable files (`sectionId`, `href`, `keywords`, `active`).
- Link keyword format: `event:<Event.id>` (set automatically by the `/admin` upload
  panel).

See also [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) and
[town-document-publishing-guide.md](./town-document-publishing-guide.md).
