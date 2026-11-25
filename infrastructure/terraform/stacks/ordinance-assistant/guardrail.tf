# Retained so an existing Bedrock guardrail is not deleted during apply.
# tow-ordinance-ask no longer calls these. Scope is enforced in lambda/ask.py.
resource "aws_bedrock_guardrail" "scope" {
  name                      = "tow-ordinance-scope"
  description               = "Refuse questions that are not about the Wiley municipal code"
  blocked_input_messaging   = "I only answer questions about the Town of Wiley municipal code and adopted ordinances."
  blocked_outputs_messaging = "I could not answer from the municipal code. The Town Clerk can provide the official text."

  topic_policy_config {
    topics_config {
      name       = "non-code-use"
      type       = "DENY"
      definition = "Homework, math, essays, coding, recipes, trivia, and requests that are not about town rules. Permit, animal, fence, zoning, parking, water, noise, and other municipal questions are allowed."
      examples = [
        "What is the capital of France?",
        "What is 12 times 8?",
        "Write a Python function that sorts a list",
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
      threshold = 0.55
    }
    filters_config {
      type      = "RELEVANCE"
      threshold = 0.55
    }
  }
}

resource "aws_bedrock_guardrail_version" "scope" {
  guardrail_arn = aws_bedrock_guardrail.scope.guardrail_arn
  description   = "Lower grounding and relevance thresholds. Narrow the denied topic to non-municipal requests."
  skip_destroy  = true

  # A guardrail edit updates only the draft. Replacing this resource publishes
  # a new version, which is what the Lambda environment variable reads.
  lifecycle {
    replace_triggered_by = [
      aws_bedrock_guardrail.scope,
    ]
  }
}

# Converse uses this guardrail so the scope denied topic cannot block a
# grounded municipal answer. This guardrail checks grounding only.
resource "aws_bedrock_guardrail" "grounding" {
  name                      = "tow-ordinance-grounding"
  description               = "Keep ordinance answers tied to the retrieved section"
  blocked_input_messaging   = "I could not answer from the municipal code. The Town Clerk can provide the official text."
  blocked_outputs_messaging = "I could not answer from the municipal code. The Town Clerk can provide the official text."

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
      threshold = 0.55
    }
    filters_config {
      type      = "RELEVANCE"
      threshold = 0.55
    }
  }
}

resource "aws_bedrock_guardrail_version" "grounding" {
  guardrail_arn = aws_bedrock_guardrail.grounding.guardrail_arn
  description   = "Grounding check with a 0.55 threshold for conversational ordinance answers."
  skip_destroy  = true
  depends_on    = [aws_bedrock_guardrail.grounding]

  lifecycle {
    replace_triggered_by = [
      aws_bedrock_guardrail.grounding,
    ]
  }
}
