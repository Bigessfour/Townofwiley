# Source inventory summary (570912405222)

Generated during Phase 0. Live detail JSON is under `exports/` (gitignored).

## DNS

- Zone: `Z088746831TMIL67NZ0VF` / `townofwiley.gov`
- Apex, `www`, `*` → CloudFront `E1NZ3XCY5CYR1J` (`d34qrz3qxoppc5.cloudfront.net`)
- MX → `10 mail.townofwiley.gov.`
- `mail` A → `208.117.67.118` (Synology)
- SES Easy DKIM CNAMEs (old account) + Synology `mail._domainkey` + SPF/DMARC

## Hosting

- S3: `townofwiley-static-site`
- CloudFront: `E1NZ3XCY5CYR1J`
- ACM us-east-1: `a7d4c19b-070a-478b-9f3a-7203e53fcf90`
- Logs: `townofwiley-cf-logs`

## CMS / auth

- AppSync: `j7b2x3sh7rcezekekkxxiak7hi` (`townofwiley-main`)
- Cognito: `us-east-2_DmY7BCBIp` (Staff group)
- Docs S3: `townofwiley-documents-storage-main`
- CFN stack: `amplify-townofwiley-main-d1245`

## Leave in old account

- `stephenmckitrick.com` hosted zone and related CloudFront
