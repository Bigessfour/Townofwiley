# Town of Wiley CDK foundations (account 818904800844)

## Profiles

```bash
export AWS_PROFILE=tow
export AWS_DEFAULT_REGION=us-east-2
aws sts get-caller-identity   # must be 818904800844
```

## Stacks

| Stack | Region | Purpose |
| --- | --- | --- |
| `TowDns` | us-east-2 | Public hosted zone + Synology mail/SPF/DMARC/DKIM |
| `TowCertificate` | us-east-1 | ACM for CloudFront (apex, www, staging) |
| `TowHosting` | us-east-2 | S3 + OAC + CloudFront + Route 53 aliases |
| `TowSes` | us-east-2 | SES domain identity + Easy DKIM |

## Deploy

```bash
cd infrastructure/cdk
npx cdk bootstrap aws://818904800844/us-east-2 aws://818904800844/us-east-1
npx cdk deploy TowDns --require-approval never
npx cdk deploy TowCertificate --require-approval never &
# While cert waits on DNS validation:
./scripts/mirror-acm-validation-to-source-zone.sh
npx cdk deploy TowHosting TowSes --require-approval never
./scripts/mirror-ses-dkim-to-source-zone.sh
./scripts/point-staging-to-tow-cloudfront.sh
```

Do **not** change registrar nameservers until Phase 3 checklist is green.
