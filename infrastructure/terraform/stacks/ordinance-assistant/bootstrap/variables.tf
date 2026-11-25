variable "expected_account_id" {
  type        = string
  description = "Town of Wiley account. This stack refuses the legacy personal account."
  default     = "818904800844"
}

variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "aws_profile" {
  type    = string
  default = "tow"
}

variable "state_bucket_name" {
  type    = string
  default = "tow-ordinance-terraform-state-818904800844"
}

variable "lock_table_name" {
  type    = string
  default = "tow-ordinance-terraform-locks"
}
