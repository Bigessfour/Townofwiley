module "context" {
  source = "../../modules/manifest-context"

  manifest_path = "${path.module}/../../../aws-infrastructure.manifest.json"
}

# Read-only alignment with manifest Lambdas (HashiCorp: data sources refresh at plan; no drift apply by default).
data "aws_lambda_function" "manifest" {
  for_each = {
    for entry in module.context.lambda_functions :
    entry.functionName => entry
    if try(entry.region, var.aws_region) == var.aws_region
  }

  function_name = each.key
}

data "aws_lambda_function" "manifest_us_east_1" {
  provider = aws.us_east_1

  for_each = {
    for entry in module.context.lambda_functions :
    entry.functionName => entry
    if try(entry.region, var.aws_region) == "us-east-1"
  }

  function_name = each.key
}

# Optional: manage log retention (set manage_lambda_log_retention = true and import each log group).
module "lambda_log_retention" {
  source = "../../modules/cloudwatch-log-retention"

  for_each = var.manage_lambda_log_retention ? data.aws_lambda_function.manifest : {}

  log_group_name    = "/aws/lambda/${each.key}"
  retention_in_days = 1
}