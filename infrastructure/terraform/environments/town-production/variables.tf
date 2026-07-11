variable "expected_account_id" {
  type    = string
  default = "570912405222"
}

variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "aws_profile" {
  type        = string
  description = "Optional CLI profile; leave empty when using exported env credentials (see terraform-export-aws-env.sh)."
  default     = ""
}

variable "environment" {
  type    = string
  default = "production"
}

variable "manage_lambda_log_retention" {
  type        = bool
  description = "When true, Terraform manages 1-day retention on manifest Lambda log groups (import existing groups first)."
  default     = false
}