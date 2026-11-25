terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.74.0, < 7.0.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}
