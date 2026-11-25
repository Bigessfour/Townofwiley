#!/usr/bin/env bash
# Upload the prepared ordinance sections and start one Bedrock ingestion job.
# Refuses to run until CONFIRM=yes. Does not create the bucket or the knowledge base.
set -euo pipefail

if [[ "${CONFIRM:-}" != "yes" ]]; then
  echo "Set CONFIRM=yes after terraform apply in the Town account 818904800844." >&2
  exit 1
fi

: "${KNOWLEDGE_BASE_ID:?}"
: "${DATA_SOURCE_ID:?}"

# Do not inherit AWS_PROFILE. This machine often has it set to a different login.
profile="${ORDINANCE_AWS_PROFILE:-tow}"
region="${AWS_REGION:-us-east-2}"
account="$(aws sts get-caller-identity --profile "$profile" --query Account --output text)"
if [[ "$account" != "818904800844" ]]; then
  echo "Refusing to upload. Profile $profile is account $account." >&2
  exit 1
fi

bucket="tow-ordinance-source-818904800844"
desktop="${HOME}/Desktop/Town of Wiley Ordinances"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Adds ordinances/, resolutions/, 19/, and 20/ under ingest/source.
# Does not rewrite the municipal-code section files and does not embed locally.
python3 "$repo/scripts/ordinances/expand_corpus.py" --source "$desktop" --output "${desktop}/ingest/source"

# Sync without --delete so files already in the knowledge base stay in the bucket.
aws s3 sync "${desktop}/ingest/source" "s3://${bucket}/source/" --profile "$profile" --region "$region"
# Originals of the sectioned code chapters. raw/ is not a knowledge-base prefix.
raw_files=(
  "01 Wiley Clean.doc" "02 Wiley Clean.doc" "04 Wiley Clean.doc" "05 Wiley Clean.doc"
  "07 Wiley Clean.doc" "08 Wiley Clean.doc" "10 Wiley Clean.doc" "11 Wiley Clean.doc"
  "13 Wiley Clean.doc" "15 Wiley Clean.doc" "16 Wiley Clean.doc" "17 Wiley Clean.doc"
  "18 Wiley Clean.doc" "dog ordinance.docx"
)
for name in "${raw_files[@]}"; do
  aws s3 cp "${desktop}/${name}" "s3://${bucket}/raw/${name}" --profile "$profile" --region "$region"
done

aws bedrock-agent start-ingestion-job \
  --profile "$profile" --region "$region" \
  --knowledge-base-id "$KNOWLEDGE_BASE_ID" \
  --data-source-id "$DATA_SOURCE_ID"
