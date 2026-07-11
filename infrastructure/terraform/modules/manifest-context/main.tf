locals {
  manifest = jsondecode(file(var.manifest_path))
}

output "account_id" {
  value = local.manifest.accountId
}

output "primary_region" {
  value = local.manifest.primaryRegion
}

output "lambda_functions" {
  description = "Custom integration Lambdas from manifest (not Amplify-generated)."
  value       = local.manifest.lambdaFunctions
}

output "hosting" {
  value = local.manifest.hosting
}

output "appsync_api_id" {
  value = try(local.manifest.appsync.apiId, null)
}