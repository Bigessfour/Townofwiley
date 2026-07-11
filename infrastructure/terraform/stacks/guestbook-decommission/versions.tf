terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # One-shot decommission; local state only (no S3 bootstrap required).
  backend "local" {
    path = "terraform.tfstate"
  }
}