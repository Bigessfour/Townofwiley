# Town newsletter PDF (clerk procedure)

The `/news` page renders the **latest** Town newsletter as an inline PDF card.
Older newsletters stay in the CMS history but are not shown publicly.

The data flow:

1. The PDF lives in the Amplify documents S3 bucket under the prefix
   `documents/newsletter/`.
2. An `Announcement` record in the CMS holds the metadata: title, date, and the
   storage key (in `attachmentKey`).
3. The public `/news` page reads the latest active `Announcement` whose
   `announcementKind` is `newsletter`, resolves `attachmentKey` to a presigned
   S3 URL, and renders it inside a PrimeNG `p-card` with an `<iframe>` preview
   and an "Open newsletter PDF in a new tab" download link.

## Publishing a new monthly newsletter

**Clerk path (preferred):** `/admin` → **Post news or notice** → **Edit content** →
**Kind** = Newsletter (PDF on /news) → upload PDF in **Newsletter PDF** → save →
verify `/news`.

**IT path (fallback):**

1. **Upload the PDF** to S3 at `documents/newsletter/<file>.pdf`. Use a date-
   prefixed filename so issues sort naturally, e.g.
   `documents/newsletter/2026-05-06-town-newsletter.pdf`.
   - `/admin` → **Upload newsletter PDF** (copies file code for the Announcement form).
   - Amplify Studio: open Storage → File browser → navigate to or create the
     `documents/newsletter/` folder → upload the PDF.
   - Or via AWS CLI:
     ```bash
     aws s3 cp ./Scan\ \[05_06_2026\].pdf \
       s3://townofwiley-documents-storage-main/documents/newsletter/2026-05-06-town-newsletter.pdf \
       --region us-east-2
     ```
2. **Open the Announcement editor** on `/admin` (or Amplify Studio Data Manager as fallback).
3. **Create or update the active newsletter record**:
   - `title`: human-readable issue name (e.g. `May 2026 Town Newsletter`).
   - `date`: the issue date in `YYYY-MM-DD` (used to pick the latest issue).
   - `detail`: short summary for screen readers and the fallback view if the
     PDF link ever fails to resolve.
   - `announcementKind`: `newsletter` (must match exactly).
   - `attachmentKey`: the S3 key from step 1, e.g.
     `documents/newsletter/2026-05-06-town-newsletter.pdf`. Do **not** paste a
     full https URL — the app resolves the presigned URL at runtime.
   - `priority`: `1` (lower numbers sort first).
   - `active`: `true`.
4. **Hide older newsletters** by setting their `active` flag to `false`. The
   page will pick whichever active newsletter has the most recent date, but
   inactive records are excluded from the public list entirely.
5. **Refresh `/news`** and verify:
   - Only one newsletter card is visible at the top of the page.
   - The PDF preview iframe loads inside the card.
   - The "Open newsletter PDF in a new tab" link downloads the same PDF.

## CSP / hosting notes

The Content Security Policy in `customHttp.yml` allows the iframe to load PDFs
from the documents bucket via `frame-src https://townofwiley-documents-storage.s3.us-east-2.amazonaws.com`.
If the bucket name ever changes, update `customHttp.yml` and run:

```bash
AWS_PROFILE=townofwiley AWS_REGION=us-east-2 npm run amplify:sync-headers
```

so the deployed Amplify customHeaders match the repo SOT. See
[AMPLIFY_HOSTING_SOT.md](AMPLIFY_HOSTING_SOT.md) section 3 for the full drift
procedure and the daily GitHub Actions probe.

## Guest IAM (newsletter PDF AccessDenied / ListBucket)

You do **not** need a new IAM role. Public PDFs use the existing Cognito **guest**
(unauthenticated) role from Gen 1:

| Item          | Value                                            |
| ------------- | ------------------------------------------------ |
| Role          | `amplify-townofwiley-main-d1245-unauthRole`      |
| Identity pool | `us-east-2:2c69cd53-7ed6-4032-9e65-b5492cd36e56` |
| Inline policy | `documentsGuestReadAccess`                       |

Policy SSOT: [`infrastructure/iam/documents-guest-read-access-policy.json`](../infrastructure/iam/documents-guest-read-access-policy.json)

Required permissions for `/news` and linked meeting PDFs:

- `s3:GetObject` on `arn:aws:s3:::townofwiley-documents-storage-main/*`
- `s3:ListBucket` on the bucket (Amplify Storage `getUrl` may list with a prefix)

**Apply or refresh the policy (IT):**

```bash
export AWS_PROFILE=townofwiley AWS_REGION=us-east-2
npm run aws:iam:documents-storage
```

Or apply guest policy only:

```bash
aws iam put-role-policy \
  --role-name amplify-townofwiley-main-d1245-unauthRole \
  --policy-name documentsGuestReadAccess \
  --policy-document file://infrastructure/iam/documents-guest-read-access-policy.json
```

Staff `/admin` uploads use **`amplify-townofwiley-main-d1245-authRole`** — same script updates
`documentsAuthAccess` from [`documents-auth-access-policy.json`](../infrastructure/iam/documents-auth-access-policy.json).

**Symptom:** iframe shows XML `AccessDenied` mentioning `s3:ListBucket` and
`amplify-townofwiley-main-d1245-unauthRole`.

**Checks:**

1. PDF object exists at the exact `attachmentKey` (e.g. `documents/newsletter/2026-06-09-town-newsletter.pdf`).
2. Guest policy above is attached (not only the staff `authRole`).
3. Hard-refresh `/news` after policy or deploy changes (guest credentials cache ~15 min).

The app resolves CMS keys with Amplify `getUrl({ path })` so keys are **not**
prefixed with `public/` (see `DocumentUploadService.resolveDocumentHref`).

## Schema reference

[`amplify/backend/api/townofwiley/schema.graphql`](../amplify/backend/api/townofwiley/schema.graphql)
exposes the `attachmentKey` field on `Announcement`:

```graphql
type Announcement @model {
  # ...
  announcementKind: String # `newsletter` for the /news block
  attachmentKey: String # S3 key under documents/newsletter/, e.g.
  # documents/newsletter/2026-05-06-town-newsletter.pdf
  priority: Int
  active: Boolean!
}
```

The same record drives the bilingual `/news` Town newsletter section. No
additional model or section is created — clerks edit one record per issue.
