terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state by default (E2E/CI friendly). Optional S3: copy backend.hcl.example → backend.hcl and
  # terraform init -reconfigure -backend-config=backend.hcl (after bootstrap/state-backend apply).
  backend "local" {
    path = "terraform.tfstate"
  }
}