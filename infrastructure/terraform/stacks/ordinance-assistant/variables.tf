variable "expected_account_id" {
  type        = string
  description = "Town of Wiley account. The legacy personal account 570912405222 is refused."
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

variable "corpus_bucket_name" {
  type    = string
  default = "tow-ordinance-source-818904800844"
}

variable "vector_bucket_name" {
  type    = string
  default = "tow-ordinance-vectors-818904800844"
}

variable "embedding_model_id" {
  type        = string
  description = "Confirm this model is enabled in us-east-2 before apply."
  default     = "amazon.titan-embed-text-v2:0"
}

variable "embedding_dimensions" {
  type        = number
  description = "Titan Text Embeddings v2 supports 256, 512, or 1024. 1024 is the full vector."
  default     = 1024
}

variable "generator_model_id" {
  type        = string
  description = "Enabled Converse model. Nova Lite is active in us-east-2 and is invoked through its US inference profile."
  default     = "us.amazon.nova-lite-v1:0"
}

variable "min_score" {
  type    = number
  default = 0.7
}

variable "max_tokens" {
  type    = number
  default = 512
}

variable "daily_spend_alarm_usd" {
  type        = number
  description = "CloudWatch billing alarm for Amazon Bedrock estimated charges."
  default     = 20
}

variable "allowed_origins" {
  type = list(string)
  default = [
    "https://townofwiley.gov",
    "https://www.townofwiley.gov",
    "http://127.0.0.1:4300",
    "http://localhost:4300",
  ]
}
