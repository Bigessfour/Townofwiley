#!/usr/bin/env bash
# Point staging.townofwiley.gov (in the LIVE source zone) at the new CloudFront.
set -euo pipefail

TARGET_PROFILE="${TARGET_PROFILE:-tow}"
SOURCE_PROFILE="${SOURCE_PROFILE:-townofwiley}"
SOURCE_ZONE="${SOURCE_ZONE:-Z088746831TMIL67NZ0VF}"

DIST_DOMAIN="$(aws cloudformation describe-stacks --profile "$TARGET_PROFILE" --region us-east-2 \
  --stack-name TowHosting --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue | [0]" --output text)"
[[ -n "$DIST_DOMAIN" && "$DIST_DOMAIN" != "None" ]] || { echo "TowHosting DistributionDomainName missing" >&2; exit 1; }

# CloudFront alias target hosted zone is always Z2FDTNDATAQYW2
CHANGE=$(cat <<EOF
{
  "Comment": "Staging alias to tow CloudFront during dual-run",
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "staging.townofwiley.gov.",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "${DIST_DOMAIN}",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
EOF
)
TMP="$(mktemp)"
printf '%s' "$CHANGE" >"$TMP"
aws route53 change-resource-record-sets --profile "$SOURCE_PROFILE" \
  --hosted-zone-id "$SOURCE_ZONE" --change-batch "file://${TMP}"
rm -f "$TMP"
echo "staging.townofwiley.gov -> ${DIST_DOMAIN}"
