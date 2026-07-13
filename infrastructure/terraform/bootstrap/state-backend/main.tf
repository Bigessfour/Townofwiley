data "aws_caller_identity" "current" {}

locals {
  account_ok = data.aws_caller_identity.current.account_id == var.expected_account_id
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = var.state_bucket_name

  lifecycle {
    precondition {
      condition     = local.account_ok
      error_message = "Refusing to create state bucket outside account ${var.expected_account_id}."
    }
  }

  tags = {
    Project     = "TOW"
    ManagedBy   = "terraform-bootstrap"
    CostCenter  = "TownOfWiley"
    Description = "Terraform remote state for townofwiley.gov"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Project    = "TOW"
    ManagedBy  = "terraform-bootstrap"
    CostCenter = "TownOfWiley"
  }
}

output "state_bucket" {
  value = aws_s3_bucket.terraform_state.bucket
}

output "lock_table" {
  value = aws_dynamodb_table.terraform_locks.name
}