resource "aws_cloudwatch_log_group" "ask" {
  name              = "/aws/lambda/tow-ordinance-ask"
  retention_in_days = 14
}

data "archive_file" "ask" {
  type        = "zip"
  source_file = "${path.module}/lambda/ask.py"
  output_path = "${path.module}/.terraform/ask.zip"
}

resource "aws_lambda_function" "ask" {
  function_name    = "tow-ordinance-ask"
  role             = aws_iam_role.ask.arn
  runtime          = "python3.12"
  handler          = "ask.lambda_handler"
  filename         = data.archive_file.ask.output_path
  source_code_hash = data.archive_file.ask.output_base64sha256
  timeout          = 20
  memory_size      = 256

  environment {
    variables = {
      KNOWLEDGE_BASE_ID = aws_bedrockagent_knowledge_base.ordinance.id
      MODEL_ID          = var.generator_model_id
      GUARDRAIL_ID      = aws_bedrock_guardrail.scope.guardrail_id
      GUARDRAIL_VERSION = aws_bedrock_guardrail_version.scope.version
      MIN_SCORE         = tostring(var.min_score)
      MAX_TOKENS        = tostring(var.max_tokens)
      ALLOWED_ORIGINS   = join(",", var.allowed_origins)
    }
  }

  depends_on = [aws_cloudwatch_log_group.ask, aws_iam_role_policy.ask]
}
