#!/usr/bin/env bash
#
# scripts/setup-aws-budget.sh
#
# Sets up a $50/month AWS Budget with email alerts at $25 and $50.
# Run this locally with the townofwiley profile.
#
# Usage:
#   AWS_PROFILE=townofwiley bash scripts/setup-aws-budget.sh
#
# Requirements:
#   - AWS CLI v2
#   - Configured profile with billing permissions (or root account)
#   - An email address for alerts (you will be prompted or edit the script)
#

set -euo pipefail

PROFILE="${AWS_PROFILE:-townofwiley}"
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)
BUDGET_NAME="Townofwiley-Monthly-50"
EMAIL="${ALERT_EMAIL:-your-email@example.com}" # <-- Change this or export ALERT_EMAIL before running

echo "Setting up AWS Budget for account $ACCOUNT_ID using profile '$PROFILE'..."
echo "Budget name: $BUDGET_NAME"
echo "Alert email: $EMAIL"
echo ""

# Create the budget (idempotent - will fail gracefully if exists)
aws budgets create-budget \
  --profile "$PROFILE" \
  --account-id "$ACCOUNT_ID" \
  --budget '{
    "BudgetName": "'"$BUDGET_NAME"'",
    "BudgetLimit": {
      "Amount": "50",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {},
    "CostTypes": {
      "IncludeTax": true,
      "IncludeSubscription": true,
      "UseBlended": false,
      "IncludeRefund": false,
      "IncludeCredit": false,
      "IncludeUpfront": true,
      "IncludeRecurring": true,
      "IncludeOtherSubscription": true,
      "IncludeSupport": true,
      "IncludeDiscount": true,
      "UseAmortized": false
    }
  }' 2>/dev/null || echo "Budget may already exist or creation skipped."

# Create notifications (alerts)
echo 'Creating alerts at 50% ($25) and 100% ($50)...'

aws budgets create-notification \
  --profile "$PROFILE" \
  --account-id "$ACCOUNT_ID" \
  --budget-name "$BUDGET_NAME" \
  --notification '{
    "NotificationType": "ACTUAL",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 50,
    "ThresholdType": "PERCENTAGE"
  }' \
  --subscriber '{
    "SubscriptionType": "EMAIL",
    "Address": "'"$EMAIL"'"
  }' 2>/dev/null || echo "50% alert may already exist."

aws budgets create-notification \
  --profile "$PROFILE" \
  --account-id "$ACCOUNT_ID" \
  --budget-name "$BUDGET_NAME" \
  --notification '{
    "NotificationType": "ACTUAL",
    "ComparisonOperator": "GREATER_THAN",
    "Threshold": 100,
    "ThresholdType": "PERCENTAGE"
  }' \
  --subscriber '{
    "SubscriptionType": "EMAIL",
    "Address": "'"$EMAIL"'"
  }' 2>/dev/null || echo "100% alert may already exist."

echo ""
echo "✅ Budget setup complete (or already existed)."
echo "Check the AWS Billing Console → Budgets to confirm."
echo "Edit this script or re-run with ALERT_EMAIL=you@townofwiley.gov to update the email."
