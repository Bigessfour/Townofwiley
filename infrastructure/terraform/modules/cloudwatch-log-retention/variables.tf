variable "log_group_name" {
  type        = string
  description = "CloudWatch log group name (e.g. /aws/lambda/TownOfWileyNWSWeatherProxy)."
}

variable "retention_in_days" {
  type    = number
  default = 1
}