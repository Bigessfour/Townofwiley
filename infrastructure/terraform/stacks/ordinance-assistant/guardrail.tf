resource "aws_bedrock_guardrail" "scope" {
  name                      = "tow-ordinance-scope"
  description               = "Refuse questions that are not about the Wiley municipal code"
  blocked_input_messaging   = "I only answer questions about the Town of Wiley municipal code and adopted ordinances."
  blocked_outputs_messaging = "I could not answer from the municipal code. The Town Clerk can provide the official text."

  topic_policy_config {
    topics_config {
      name       = "non-code-use"
      type       = "DENY"
      definition = "Homework, math, essays, coding, recipes, trivia, and general knowledge. Questions about municipal code requirements are allowed."
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
  description   = "Allow municipal code questions. Refuse homework and general knowledge."
}

# The scope guardrail's denied topic also blocks legitimate code answers.
# Converse uses this guardrail, which checks grounding and not the topic.
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
      threshold = 0.7
    }
    filters_config {
      type      = "RELEVANCE"
      threshold = 0.7
    }
  }
}

resource "aws_bedrock_guardrail_version" "grounding" {
  guardrail_arn = aws_bedrock_guardrail.grounding.guardrail_arn
  description   = "Grounding check for ordinance answers"
  depends_on    = [aws_bedrock_guardrail.grounding]
}
