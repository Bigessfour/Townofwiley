output "verified_account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "manifest_account_id" {
  value = module.context.account_id
}

output "lambda_function_arns" {
  description = "ARNs from data sources (manifest Lambdas in us-east-2)."
  value = {
    for name, fn in data.aws_lambda_function.manifest : name => fn.arn
  }
}

output "lambda_function_arns_us_east_1" {
  description = "ARNs from data sources (manifest Lambdas in us-east-1)."
  value = {
    for name, fn in data.aws_lambda_function.manifest_us_east_1 : name => fn.arn
  }
}