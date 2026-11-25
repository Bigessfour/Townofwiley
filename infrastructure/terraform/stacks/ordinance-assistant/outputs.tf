output "corpus_bucket" {
  value = aws_s3_bucket.corpus.bucket
}

output "knowledge_base_id" {
  value = aws_bedrockagent_knowledge_base.ordinance.id
}

output "data_source_id" {
  value = aws_bedrockagent_data_source.ordinance.data_source_id
}

output "ask_url" {
  value = "${aws_api_gateway_stage.ask.invoke_url}/ask"
}

output "ask_api_key" {
  value       = aws_api_gateway_api_key.ask.value
  description = "Throttle token for the public page. It is not an AWS credential. Put it in ORDINANCE_API_KEY when the endpoint is turned on."
  sensitive   = true
}

output "generator_model_id" {
  value = var.generator_model_id
}

output "spend_topic_arn" {
  value = aws_sns_topic.spend.arn
}
