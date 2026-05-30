# Town Document Publishing Guide

**Use [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) for all public document publishing.** This page is a short pointer so older links still land in the right place.

## Where documents live

- **Studio:** Create and edit rows in **PublicDocument** (Amplify Studio Data Manager).
- **Resident page:** [https://townofwiley.gov/documents](https://townofwiley.gov/documents) lists every active `PublicDocument` by `sectionId`.
- **Files:** Upload PDFs and similar files to Town document storage (see CLERK-CMS-GUIDE) or link stable public HTML under `/documents/archive/` when IT provides a path.

The site no longer uses a repo manifest (`document-archive.ts`). New guides and packets appear after you save in Studio—no frontend deploy required.

## Quick checklist

1. Open **PublicDocument** in Data Manager.
2. Set **title**, **summary**, and optional **titleEs** / **summaryEs** / **statusEs** for Spanish.
3. Set **sectionId** (`records-requests`, `meeting-documents`, `financial-documents`, or `code-references`).
4. Set **href** (storage key or public URL) and **format** / **status**.
5. Set **active** to true and **displayOrder** if needed.
6. Save, open `/documents` (hard refresh once), and confirm the card appears. Other residents see it on their next visit or when returning to the tab.

## Seed legacy guide rows (ops / IT once per environment)

After deploying the `titleEs` / `summaryEs` / `statusEs` schema fields:

```bash
npm run seed:public-documents
```

Or export JSON for manual import: `node scripts/seed-public-documents-from-archive.mjs --export-json`

## More detail

- [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md) — PublicDocument fields, agenda packets, bilingual copy
- [CMS-STUDIO-OPERATIONS-CHECKLIST.md](./CMS-STUDIO-OPERATIONS-CHECKLIST.md) — post-edit verification on `/documents`
