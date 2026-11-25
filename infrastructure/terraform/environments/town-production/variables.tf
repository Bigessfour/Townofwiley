variable "expected_account_id" {
  type    = string
  default = "818904800844"
}

variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "aws_profile" {
  type        = string
  description = "CLI profile for the Town account. Leave empty when credentials are already exported."
  default     = "tow"
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