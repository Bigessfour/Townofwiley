#!/usr/bin/env bash
# Create (or show) tow-ops-alerts SNS topic in account 570912405222 / us-east-2.
# Usage: source scripts/agent-aws-env.sh && bash scripts/ops_ensure_sns_topic.sh [email]
set -euo pipefail
REGION="${AWS_DEFAULT_REGION:-us-east-2}"
NAME="${TOW_OPS_SNS_TOPIC_NAME:-tow-ops-alerts}"
EMAIL="${1:-}"

echo "Caller:"
aws sts get-caller-identity

TOPIC_ARN=$(aws sns create-topic --name "$NAME" --region "$REGION" --query TopicArn --output text)
echo "TopicArn=$TOPIC_ARN"
echo "Set GitHub secret TOW_OPS_SNS_TOPIC_ARN and Lambda env TOW_OPS_SNS_TOPIC_ARN to this value."

if [[ -n "$EMAIL" ]]; then
  aws sns subscribe \
    --topic-arn "$TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$EMAIL" \
    --region "$REGION"
  echo "Confirm subscription email sent to $EMAIL"
fi
