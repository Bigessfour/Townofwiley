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
  description = "Optional CLI profile; leave empty when using exported env credentials."
  default     = ""
}

variable "function_name" {
  type    = string
  default = "TownOfWileyGuestbook"
}

variable "role_name" {
  type    = string
  default = "TownOfWileyGuestbookRole"
}

variable "table_name" {
  type    = string
  default = "TownOfWileyGuestbook"
}

variable "inline_policy_name" {
  type    = string
  default = "TownOfWileyGuestbookPolicy"
}