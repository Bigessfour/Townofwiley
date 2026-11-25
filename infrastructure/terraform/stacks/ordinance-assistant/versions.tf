terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.74.0, < 7.0.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # Partial backend. Copy backend.hcl.example to backend.hcl after the bootstrap
  # stack creates the Town-account state bucket. Do not point this at the
  # legacy personal-account state bucket.
  backend "s3" {}
}
