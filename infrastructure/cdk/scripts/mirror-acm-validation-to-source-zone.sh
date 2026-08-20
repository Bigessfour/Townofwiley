#!/usr/bin/env bash
# Mirror ACM DNS validation CNAMEs from the new-account cert into the live
# source hosted zone (570912405222) so validation succeeds before NS cutover.
set -euo pipefail

TARGET_PROFILE="${TARGET_PROFILE:-tow}"
SOURCE_PROFILE="${SOURCE_PROFILE:-townofwiley}"
SOURCE_ZONE="${SOURCE_ZONE:-Z088746831TMIL67NZ0VF}"
REGION_CERT="${REGION_CERT:-us-east-1}"
DOMAIN="${DOMAIN:-townofwiley.gov}"

TARGET_ACCOUNT="$(aws sts get-caller-identity --profile "$TARGET_PROFILE" --query Account --output text)"
SOURCE_ACCOUNT="$(aws sts get-caller-identity --profile "$SOURCE_PROFILE" --query Account --output text)"
[[ "$TARGET_ACCOUNT" == "818904800844" ]] || { echo "tow profile wrong account: $TARGET_ACCOUNT" >&2; exit 1; }
[[ "$SOURCE_ACCOUNT" == "570912405222" ]] || { echo "townofwiley profile wrong account: $SOURCE_ACCOUNT" >&2; exit 1; }

CERT_ARN="$(aws acm list-certificates --profile "$TARGET_PROFILE" --region "$REGION_CERT" \
  --query "CertificateSummaryList[?DomainName=='${DOMAIN}'].CertificateArn | [0]" --output text)"
if [[ -z "$CERT_ARN" || "$CERT_ARN" == "None" ]]; then
  echo "No ACM cert for ${DOMAIN} in ${TARGET_ACCOUNT}/${REGION_CERT} yet" >&2
  exit 1
fi

echo "Mirroring validation for $CERT_ARN"

CERT_JSON="$(aws acm describe-certificate --profile "$TARGET_PROFILE" --region "$REGION_CERT" \
  --certificate-arn "$CERT_ARN" --output json)"

CHANGES="$(CERT_JSON="$CERT_JSON" python3 - <<'PY'
import json, os
cert = json.loads(os.environ["CERT_JSON"])["Certificate"]
changes = []
for opt in cert.get("DomainValidationOptions") or []:
    rr = (opt.get("ResourceRecord") or {})
    name, typ, value = rr.get("Name"), rr.get("Type"), rr.get("Value")
    if not (name and typ and value):
        continue
    changes.append({
        "Action": "UPSERT",
        "ResourceRecordSet": {
            "Name": name,
            "Type": typ,
            "TTL": 300,
            "ResourceRecords": [{"Value": value}],
        },
    })
print(json.dumps({"Comment": "ACM validation mirror for tow migration", "Changes": changes}))
PY
)"

COUNT="$(python3 -c 'import json,sys; print(len(json.load(sys.stdin)["Changes"]))' <<<"$CHANGES")"
if [[ "$COUNT" -eq 0 ]]; then
  echo "No validation records to mirror (cert may already be issued)"
  aws acm describe-certificate --profile "$TARGET_PROFILE" --region "$REGION_CERT" \
    --certificate-arn "$CERT_ARN" --query 'Certificate.Status' --output text
  exit 0
fi

TMP="$(mktemp)"
printf '%s' "$CHANGES" >"$TMP"
aws route53 change-resource-record-sets --profile "$SOURCE_PROFILE" \
  --hosted-zone-id "$SOURCE_ZONE" --change-batch "file://${TMP}"
rm -f "$TMP"
echo "Upserted ${COUNT} validation record(s) into source zone ${SOURCE_ZONE}"
