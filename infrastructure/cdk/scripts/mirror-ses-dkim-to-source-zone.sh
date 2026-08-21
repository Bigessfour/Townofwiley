#!/usr/bin/env bash
# Mirror SES Easy DKIM CNAMEs from the new tow zone into the live source zone.
set -euo pipefail

TARGET_PROFILE="${TARGET_PROFILE:-tow}"
SOURCE_PROFILE="${SOURCE_PROFILE:-townofwiley}"
SOURCE_ZONE="${SOURCE_ZONE:-Z088746831TMIL67NZ0VF}"
DOMAIN="${DOMAIN:-townofwiley.gov}"
REGION="${AWS_DEFAULT_REGION:-us-east-2}"

TARGET_ACCOUNT="$(aws sts get-caller-identity --profile "$TARGET_PROFILE" --query Account --output text)"
SOURCE_ACCOUNT="$(aws sts get-caller-identity --profile "$SOURCE_PROFILE" --query Account --output text)"
[[ "$TARGET_ACCOUNT" == "818904800844" ]] || { echo "tow profile wrong account" >&2; exit 1; }
[[ "$SOURCE_ACCOUNT" == "570912405222" ]] || { echo "townofwiley profile wrong account" >&2; exit 1; }

TOKENS="$(aws sesv2 get-email-identity --profile "$TARGET_PROFILE" --region "$REGION" \
  --email-identity "$DOMAIN" --query 'DkimAttributes.Tokens' --output json)"

CHANGES="$(python3 - <<PY
import json
tokens = json.loads('''${TOKENS}''')
changes = []
for t in tokens:
    changes.append({
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": f"{t}._domainkey.${DOMAIN}.",
            "Type": "CNAME",
            "TTL": 300,
            "ResourceRecords": [{"Value": f"{t}.dkim.amazonses.com"}],
        },
    })
print(json.dumps({"Comment": "SES DKIM mirror for tow migration", "Changes": changes}))
PY
)"

TMP="$(mktemp)"
printf '%s' "$CHANGES" >"$TMP"
aws route53 change-resource-record-sets --profile "$SOURCE_PROFILE" \
  --hosted-zone-id "$SOURCE_ZONE" --change-batch "file://${TMP}"
rm -f "$TMP"
echo "Mirrored SES DKIM tokens into source zone"
