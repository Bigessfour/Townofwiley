variable "expected_account_id" {
  type        = string
  description = "Town of Wiley production account."
  default     = "570912405222"
}

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "state_bucket_name" {
  type        = string
  description = "S3 bucket for Terraform state (must be globally unique)."
  default     = "townofwiley-terraform-state-570912405222"
}

variable "lock_table_name" {
  type    = string
  default = "townofwiley-terraform-locks"
}