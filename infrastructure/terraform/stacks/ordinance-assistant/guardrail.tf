resource "aws_bedrock_guardrail" "scope" {
  name                      = "tow-ordinance-scope"
  description               = "Refuse questions that are not about the Wiley municipal code"
  blocked_input_messaging   = "I only answer questions about the Town of Wiley municipal code and adopted ordinances."
  blocked_outputs_messaging = "I could not answer from the municipal code. The Town Clerk can provide the official text."

  topic_policy_config {
    topics_config {
      name       = "non-code-use"
      type       = "DENY"
      definition = "Homework, essays, math, coding, recipes, general knowledge, and any request that is not about the Town of Wiley municipal code or an adopted Wiley ordinance."
      examples = [
        "What is the capital of France?",
        "Write my essay about zoning",
        "What is 12 times 8?",
      ]
    }
  }

  content_policy_config {
    filters_config {
      input_strength  = "HIGH"
      output_strength = "NONE"
      type            = "PROMPT_ATTACK"
    }
    filters_config {
      input_strength  = "MEDIUM"
      output_strength = "MEDIUM"
      type            = "HATE"
    }
    filters_config {
      input_strength  = "LOW"
      output_strength = "LOW"
      type            = "MISCONDUCT"
    }
  }

  contextual_grounding_policy_config {
    filters_config {
      type      = "GROUNDING"
      threshold = 0.7
    }
    filters_config {
      type      = "RELEVANCE"
      threshold = 0.7
    }
  }
}

resource "aws_bedrock_guardrail_version" "scope" {
  guardrail_arn = aws_bedrock_guardrail.scope.guardrail_arn
  description   = "Numbered version pinned by the ask function"
}
