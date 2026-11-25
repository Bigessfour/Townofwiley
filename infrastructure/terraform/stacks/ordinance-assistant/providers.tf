provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = local.default_tags
  }
}

# Billing metrics for EstimatedCharges are published only in us-east-1.
provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile

  default_tags {
    tags = local.default_tags
  }
}

data "aws_caller_identity" "current" {}

locals {
  foundation_model_id = startswith(var.generator_model_id, "us.") ? trimprefix(var.generator_model_id, "us.") : var.generator_model_id
  default_tags = {
    Environment  = "production"
    Project      = "TOW"
    Organization = "Town of Wiley"
    Site         = "townofwiley.gov"
    CostCenter   = "TownOfWiley"
    ManagedBy    = "terraform"
    Stack        = "ordinance-assistant"
  }
}

check "town_account" {
  assert {
    condition     = data.aws_caller_identity.current.account_id == var.expected_account_id
    error_message = "Refusing to create ordinance resources outside account ${var.expected_account_id}. Current: ${data.aws_caller_identity.current.account_id}."
  }
}
