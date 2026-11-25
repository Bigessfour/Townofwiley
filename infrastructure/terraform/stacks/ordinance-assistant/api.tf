# REST API, not an HTTP API. Usage plans and regional WAF attach to REST stages.
resource "aws_api_gateway_rest_api" "ask" {
  name = "tow-ordinance-ask"
}

resource "aws_api_gateway_resource" "ask" {
  rest_api_id = aws_api_gateway_rest_api.ask.id
  parent_id   = aws_api_gateway_rest_api.ask.root_resource_id
  path_part   = "ask"
}

resource "aws_api_gateway_method" "ask" {
  rest_api_id      = aws_api_gateway_rest_api.ask.id
  resource_id      = aws_api_gateway_resource.ask.id
  http_method      = "POST"
  authorization    = "NONE"
  api_key_required = true
}

resource "aws_api_gateway_integration" "ask" {
  rest_api_id             = aws_api_gateway_rest_api.ask.id
  resource_id             = aws_api_gateway_resource.ask.id
  http_method             = aws_api_gateway_method.ask.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.ask.invoke_arn
}

resource "aws_api_gateway_method" "options" {
  rest_api_id      = aws_api_gateway_rest_api.ask.id
  resource_id      = aws_api_gateway_resource.ask.id
  http_method      = "OPTIONS"
  authorization    = "NONE"
  api_key_required = false
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id             = aws_api_gateway_rest_api.ask.id
  resource_id             = aws_api_gateway_resource.ask.id
  http_method             = aws_api_gateway_method.options.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.ask.invoke_arn
}

resource "aws_api_gateway_deployment" "ask" {
  rest_api_id = aws_api_gateway_rest_api.ask.id

  triggers = {
    redeploy = sha1(jsonencode([
      aws_api_gateway_integration.ask.id,
      aws_api_gateway_integration.options.id,
      aws_api_gateway_method.ask.id,
      aws_api_gateway_method.options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "ask" {
  rest_api_id   = aws_api_gateway_rest_api.ask.id
  deployment_id = aws_api_gateway_deployment.ask.id
  stage_name    = "production"
}

resource "aws_lambda_permission" "ask" {
  statement_id  = "AllowOrdinanceApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ask.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ask.execution_arn}/*/*"
}

resource "aws_api_gateway_usage_plan" "ask" {
  name = "tow-ordinance-ask"

  api_stages {
    api_id = aws_api_gateway_rest_api.ask.id
    stage  = aws_api_gateway_stage.ask.stage_name
  }

  throttle_settings {
    burst_limit = 10
    rate_limit  = 5
  }

  quota_settings {
    limit  = 500
    period = "DAY"
  }
}

resource "aws_api_gateway_api_key" "ask" {
  name = "tow-ordinance-ask"
}

resource "aws_api_gateway_usage_plan_key" "ask" {
  key_id        = aws_api_gateway_api_key.ask.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.ask.id
}

resource "aws_wafv2_web_acl" "ask" {
  name  = "tow-ordinance-ask"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "per-ip"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "tow-ordinance-per-ip"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "tow-ordinance-ask"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "ask" {
  resource_arn = aws_api_gateway_stage.ask.arn
  web_acl_arn  = aws_wafv2_web_acl.ask.arn
}
