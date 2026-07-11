data "aws_caller_identity" "current" {}

locals {
  account_guard = data.aws_caller_identity.current.account_id == var.expected_account_id
  default_tags = {
    Environment  = var.environment
    Project      = "TOW"
    Organization = "Town of Wiley"
    Site         = "townofwiley.gov"
    CostCenter   = "TownOfWiley"
    ManagedBy    = "terraform"
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = local.default_tags
  }
}

provider "aws" {
  alias   = "us_east_1"
  region  = "us-east-1"
  profile = var.aws_profile != "" ? var.aws_profile : null

  default_tags {
    tags = local.default_tags
  }
}

check "town_account" {
  assert {
    condition     = local.account_guard
    error_message = "AWS account must be ${var.expected_account_id} (Town of Wiley). Current: ${data.aws_caller_identity.current.account_id}"
  }
}