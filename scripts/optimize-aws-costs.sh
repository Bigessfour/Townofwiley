#!/usr/bin/env bash
#
# scripts/optimize-aws-costs.sh
#
# Town of Wiley — AWS Cost Optimization Helper
# For low-traffic municipal site (100-200 visits/month)
#
# Usage:
#   AWS_PROFILE=townofwiley bash scripts/optimize-aws-costs.sh
#
# This script helps discover expensive resources (especially Aurora)
# and provides the exact commands to right-size or migrate.
#

set -euo pipefail

PROFILE="${AWS_PROFILE:-townofwiley}"
REGION="us-east-2"
ACCOUNT_ID=$(aws sts get-caller-identity --profile "$PROFILE" --query Account --output text 2>/dev/null || echo "unknown")

# macOS (BSD date) vs GNU date for Cost Explorer window
if date -v-1d +%Y-%m-%d >/dev/null 2>&1; then
  CE_START=$(date -v-30d +%Y-%m-%d)
  CE_END=$(date +%Y-%m-%d)
else
  CE_START=$(date -d '30 days ago' +%Y-%m-%d)
  CE_END=$(date +%Y-%m-%d)
fi

echo "========================================"
echo "Town of Wiley AWS Cost Optimization"
echo "Account: $ACCOUNT_ID | Profile: $PROFILE | Region: $REGION"
echo "========================================"
echo ""

echo "=== 1. Current Monthly Cost Estimate (last 30 days) ==="
aws ce get-cost-and-usage \
  --profile "$PROFILE" \
  --time-period Start="${CE_START}",End="${CE_END}" \
  --granularity MONTHLY \
  --metrics "BlendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE 2>/dev/null || echo "Cost Explorer data not available or permissions issue"

echo ""
echo "=== 2. Find Aurora / RDS Clusters (the likely big cost) ==="
aws rds describe-db-clusters \
  --profile "$PROFILE" \
  --region "$REGION" \
  --query 'DBClusters[?contains(Engine, `aurora`)].{ID:DBClusterIdentifier,Engine:Engine,Status:Status,MinACU:ServerlessV2ScalingConfiguration.MinCapacity,MaxACU:ServerlessV2ScalingConfiguration.MaxCapacity}' \
  --output table 2>/dev/null || echo "No Aurora clusters found or no permission"

echo ""
echo "=== 3. List all RDS instances/clusters (broader view) ==="
aws rds describe-db-clusters --profile "$PROFILE" --region "$REGION" --output table 2>/dev/null || true
aws rds describe-db-instances --profile "$PROFILE" --region "$REGION" --output table 2>/dev/null || true

echo ""
echo "=== 4. Check AppSync Data Sources (may point to Aurora) ==="
APPSYNC_API_ID="x7poehudqvamneqni5s6e2cjxy" # Gen 2 (from gen2-production-bindings; Gen 1 j7b2 legacy)
aws appsync list-data-sources \
  --profile "$PROFILE" \
  --region "$REGION" \
  --api-id "$APPSYNC_API_ID" \
  --output table 2>/dev/null || echo "Could not list AppSync data sources"

echo ""
echo "=== 5. Key Recommendations (from cost analysis) ==="
echo "1. If you see an Aurora Serverless v2 cluster with MinCapacity >= 0.5:"
echo "   - This is costing ~$44/month minimum even at zero traffic."
echo "   - Best options:"
echo "     a) Enable automatic pause (scale to 0 ACUs) if available"
echo "     b) Lower MaxCapacity to 1.0"
echo "     c) Migrate the data/queries to DynamoDB (recommended for this traffic level)"
echo ""
echo "2. Most of the site can stay on Amplify + DynamoDB + minimal Lambda."
echo ""
echo "Run the commands above locally, then tell me what Aurora/RDS resources you see."
echo "I will then give you the exact CLI commands to scale or migrate."
echo "========================================"
