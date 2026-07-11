# Clerk CMS reliability runbook

How Town staff and IT keep **`/admin` → AppSync → public site** working for day-to-day clerk work.

## Architecture (what “working” means)

```text
Clerk /admin form (Cognito Staff)
  → AppSync mutation (userPool)
  → DynamoDB
  → TownOfWileyCmsChangeNotifier (stream)
  → S3 /cms-snapshot.json + /cms-revision.json (~1 minute)
  → Public browsers (townofwiley.gov)
```

Homepage **photos** additionally require:

```text
Choose photo → TownOfWileyCmsMediaUpload (presign + PUT)
  → s3://townofwiley-static-site/media/cms/hero/…
  → durable URL https://townofwiley.gov/media/cms/hero/…
  → Save into SiteSettings.heroImageUrl
```

Temporary S3 `X-Amz-Signature` URLs are **rejected** by the public site and by the save form.

## Clerk self-check (every edit)

1. Sign in at https://townofwiley.gov/admin  
2. **Test CMS Connection** → Connected  
3. Open the task → **Edit content** → fill fields → **Save**  
4. Wait about one minute (public site is not instant)  
5. **See on website** → hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)  
6. If wrong: **Refresh from database** on `/admin`, then recheck the live deep link  

### Homepage photo

1. Task **Change homepage photo or welcome text** → Edit content  
2. **Choose photo from this computer** (JPG/PNG/WebP)  
3. Confirm the field fills with `https://townofwiley.gov/media/cms/hero/…`  
4. **Save**  
5. After ~1 minute, homepage hero uses that image (not the default wheat photo)

If upload fails, sign out/in and retry. Do **not** paste S3 console links.

## IT verification (after incidents or releases)

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
# API key + endpoint from live runtime-config (or secrets)
npm run verify:runtime-config-cms
npm run verify:public-cms-query
npm run verify:staff-cms-editor-models
npm run verify:cms-snapshot-parity
```

`verify:cms-snapshot-parity` checks:

- Leadership roster AppSync ↔ CDN  
- Active announcements, events, contacts, businesses, external news IDs  
- **Hero URL health** (flags temporary S3 URLs)

### Media upload Lambda

```bash
npm run deploy:cms-media-upload
# CORS must allow Origin https://townofwiley.gov (apex) and https://www.townofwiley.gov
```

### Static deploy must not wipe hero photos

`scripts/deploy-static-site.sh` uses `aws s3 sync --delete` but **excludes** `media/cms/*` (and `cms-snapshot.json` / `cms-revision.json`).  
If a future deploy removes those excludes, clerk homepage photos disappear from S3 and CloudFront serves SPA HTML instead of the image.

### Clear a bad hero URL

If AppSync has a temporary S3 hero URL:

1. `/admin` → homepage task → open the SiteSettings record  
2. Clear **Homepage hero photo** (or re-upload) → **Save**  
3. Or set `heroImageUrl` to `null` / durable `https://townofwiley.gov/media/cms/hero/…` via AppSync Queries console  

Public visitors immediately fall back to `/hero-wiley.webp` when the stored URL is ephemeral.

## Task matrix (10 clerk tasks)

| Task | Model | Public effect | Prove with |
|------|--------|---------------|------------|
| post-notice | Announcement | `/notices` or `/news` | Save + deep link |
| add-meeting | Event | `/meetings` | Save + deep link |
| homepage | SiteSettings | `/` hero + welcome | Durable hero URL + text |
| update-contacts | OfficialContact | `/contact` | Stable ids preferred |
| update-leadership | LeadershipRosterEntry | `/contact#leadership` | Reorder + lines |
| business-directory | Business | `/businesses` | Active cards |
| external-news | ExternalNewsLink | `/news` | Active links |
| emergency-banner | AlertBanner | `/` banner | Enabled row |
| edit-site-copy | SiteCopy | Partial (top tasks) | Known partial wiring |
| manage-email-aliases | EmailAlias | Staff-only | Test email |

Full deep-link contracts: [cms-edit-mode-verify-matrix.md](./cms-edit-mode-verify-matrix.md).  
Model → route SSOT: [CMS-MODEL-ROUTE-MATRIX.md](./CMS-MODEL-ROUTE-MATRIX.md).

## Failure buckets

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Save error | Auth / GraphQL | Re-login; Test CMS Connection |
| Save OK, site unchanged after 2+ min | Snapshot publisher | Re-save; `verify:cms-snapshot-parity`; Lambda logs |
| Hero save OK, still default photo | Ephemeral URL or CORS | Re-upload after media Lambda CORS fix; clear field |
| Photo upload fails immediately | Media Lambda / CORS / staff token | `deploy:cms-media-upload`; check browser Network for OPTIONS |
| Only some SiteCopy fields show | Not wired to public anchors | Expected; only top-tasks fully public |

## Related

- [CLERK-CMS-GUIDE.md](./CLERK-CMS-GUIDE.md)  
- [admin-audit-2026-06-22.md](./admin-audit-2026-06-22.md)  
- [CMS-VERIFY-STUDIO.md](./CMS-VERIFY-STUDIO.md)  
