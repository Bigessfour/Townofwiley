#!/usr/bin/env bash
#
# scripts/apply-aws-cost-optimizations.sh
#
# Town of Wiley - AWS Cost Optimization Execution Script
# Target: $20-30/month for low traffic (100-200 visits/mo)
#
# This script performs Steps 1-4 from the cost optimization conversation.
#
# Run locally after `aws login` (with townofwiley profile active):
#   AWS_PROFILE=townofwiley bash scripts/apply-aws-cost-optimizations.sh
#
# IMPORTANT:
# - Review each section before running.
# - Some commands are destructive (budget creation is safe).
# - Aurora changes can affect availability - run during low-traffic window.
# - This is based on the May 2026 cost analysis recommending move away from Aurora Serverless v2 floor.
#

set -euo pipefail

PROFILE="${AWS_PROFILE:-townofwiley}"
REGION="us-east-2"
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text)

echo "========================================"
echo "Town of Wiley AWS Cost Optimization"
echo "Account: $ACCOUNT_ID | Profile: $PROFILE"
echo "Target: $20-30/month optimized"
echo "========================================"
echo ""

# ============================================
# STEP 1: Create Budget + Alerts ($50 cap)
# ============================================
echo '=== STEP 1: Creating $50/month Budget with Alerts ==='

BUDGET_NAME="Townofwiley-Monthly-50"
ALERT_EMAIL="${ALERT_EMAIL:-admin@townofwiley.gov}" # Change this!

aws budgets create-budget \
  --profile "$PROFILE" \
  --account-id "$ACCOUNT_ID" \
  --budget '{
    "BudgetName": "'"$BUDGET_NAME"'",
    "BudgetLimit": { "Amount": "50", "Unit": "USD" },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' 2>/dev/null || echo "Budget already exists or creation skipped."

# Alerts at 50% and 100%
for THRESHOLD in 50 100; do
  aws budgets create-notification \
    --profile "$PROFILE" \
    --account-id "$ACCOUNT_ID" \
    --budget-name "$BUDGET_NAME" \
    --notification '{
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": '"$THRESHOLD"',
      "ThresholdType": "PERCENTAGE"
    }' \
    --subscriber '{
      "SubscriptionType": "EMAIL",
      "Address": "'"$ALERT_EMAIL"'"
    }' 2>/dev/null || echo "$THRESHOLD% alert may already exist."
done

echo "Budget + alerts created (or already present)."
echo ""

# ============================================
# STEP 2: Aurora Serverless v2 Optimization
# ============================================
echo "=== STEP 2: Aurora Serverless v2 Optimization ==="
echo "This is the biggest cost saver (removing ~$44/mo minimum)."

# First, the user should have run the discovery script.
# Here we provide the modification commands.

# Example: Scale down to very low range and enable pause-to-0 where possible.
# Replace CLUSTER_ID with your actual cluster from the discovery output.

# WARNING: Review the cluster name first!
CLUSTER_ID="wiley-co-aurora-db-encrypted" # from discovery (May 2026); AppSync uses DynamoDB only

echo "Commands to run (review cluster name first!):"
echo ""
echo "# Option A: Lower max capacity and enable scale-to-0 (preferred for low traffic)"
echo 'aws rds modify-db-cluster \'
echo "  --profile $PROFILE \\"
echo "  --region $REGION \\"
echo "  --db-cluster-identifier $CLUSTER_ID \\"
echo '  --serverless-v2-scaling-configuration MinCapacity=0,MaxCapacity=1 \'
echo "  --apply-immediately"
echo ""
echo "# Option B: If you want to keep a small always-on floor"
echo "# aws rds modify-db-cluster ... MinCapacity=0.5,MaxCapacity=1 ..."

echo ""
echo "After scaling, monitor for a week. If usage is truly low, consider full migration to DynamoDB."
echo ""

# ============================================
# STEP 3: S3 Lifecycle Policies
# ============================================
echo "=== STEP 3: S3 Lifecycle Policies on Documents Bucket ==="

DOCS_BUCKET="townofwiley-documents-storage-main"

aws s3api put-bucket-lifecycle-configuration \
  --profile "$PROFILE" \
  --bucket "$DOCS_BUCKET" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "DocumentsCostOptimization",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "Transitions": [
          {
            "Days": 90,
            "StorageClass": "STANDARD_IA"
          },
          {
            "Days": 365,
            "StorageClass": "GLACIER"
          }
        ],
        "NoncurrentVersionTransitions": [
          {
            "NoncurrentDays": 30,
            "StorageClass": "STANDARD_IA"
          }
        ]
      }
    ]
  }'

echo "Lifecycle policy applied to $DOCS_BUCKET (90d IA, 365d Glacier)."
echo ""

# ============================================
# STEP 4: Real Usage Data + Monitoring
# ============================================
echo "=== STEP 4: Usage Data Collection ==="

echo "Budget is now in place for ongoing monitoring."
echo "Run Cost Explorer regularly or use the optimize-aws-costs.sh script."

echo ""
echo "========================================"
echo "Optimization script complete."
echo "Next: Run the discovery commands if you haven't yet,"
echo "then apply the Aurora scaling commands above."
echo "Target: $20-30/month once free tier/credits end."
echo "========================================"
