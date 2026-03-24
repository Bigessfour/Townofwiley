# Town Document Publishing Guide

Use this workflow when you need to publish a new public reference file, packet, report, budget summary, ordinance reference, or permit-support document into the Town website archive.

## Goal

Keep the resident-facing document archive stable at `/documents` while making each published file easy to add, easy to review, and easy to search.

## Current archive shape

- Public archive files live under `public/documents/archive/`.
- The resident-facing manifest lives in `src/app/document-hub/document-archive.ts`.
- The `/documents` page reads that manifest and shows the file cards automatically.
- Homepage search also reads that manifest, so published files can appear in resident search results.

## Publish a new file

1. Create the public file under `public/documents/archive/`.
2. Use a stable filename that will not change after residents bookmark it.
3. Prefer accessible HTML for reference sheets and posting guides.
4. If you publish PDF later, make sure the PDF is searchable and accessible before posting it.
5. Add a new entry to `src/app/document-hub/document-archive.ts`.

Each manifest entry should include:

- the section id
- the public title
- a short resident-facing summary
- a status label
- an updated month or date label
- the format label
- the public href
- the download filename
- search keywords

## Section ids

- `records-requests`
- `meeting-documents`
- `financial-documents`
- `code-references`

## Writing guidance

- Use resident-facing language, not internal department shorthand.
- Tell people what the file is for and when they should still contact the Clerk.
- Keep file titles short and literal.
- Keep summaries focused on the resident task.

## Validation

Run these commands after adding or changing archive files:

```bash
npm run lint
npm run test:unit:browser
npm run test:e2e -- --workers=1
```

## Current limitation

This workflow now supports stable public downloads and searchable archive entries, but it is still repo-managed. It is not yet a CMS-managed upload flow.
