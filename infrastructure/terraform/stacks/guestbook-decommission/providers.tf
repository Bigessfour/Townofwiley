data "aws_caller_identity" "current" {}

check "town_account" {
  assert {
    condition     = data.aws_caller_identity.current.account_id == var.expected_account_id
    error_message = "Refusing guestbook destroy outside account ${var.expected_account_id}."
  }
}

# Provider retained for workspace validate/init; no AWS resources managed in this stack.
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null
}