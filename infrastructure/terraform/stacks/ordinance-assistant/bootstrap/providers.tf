provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = {
      Environment  = "production"
      Project      = "TOW"
      Organization = "Town of Wiley"
      Site         = "townofwiley.gov"
      CostCenter   = "TownOfWiley"
      ManagedBy    = "terraform"
      Stack        = "ordinance-assistant-state"
    }
  }
}

data "aws_caller_identity" "current" {}

check "town_account" {
  assert {
    condition     = data.aws_caller_identity.current.account_id == var.expected_account_id
    error_message = "Refusing to create ordinance state outside account ${var.expected_account_id}. Current: ${data.aws_caller_identity.current.account_id}."
  }
}
