data "aws_iam_policy_document" "bedrock_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"]
    }
  }
}

resource "aws_iam_role" "knowledge_base" {
  name               = "tow-ordinance-knowledge-base"
  assume_role_policy = data.aws_iam_policy_document.bedrock_assume.json
}

data "aws_iam_policy_document" "knowledge_base" {
  statement {
    sid       = "InvokeEmbeddingModel"
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel"]
    resources = ["arn:aws:bedrock:${var.aws_region}::foundation-model/${var.embedding_model_id}"]
  }

  statement {
    sid    = "ReadCorpus"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetObject",
    ]
    resources = [
      aws_s3_bucket.corpus.arn,
      "${aws_s3_bucket.corpus.arn}/source/*",
    ]
  }

  statement {
    sid    = "WriteVectors"
    effect = "Allow"
    actions = [
      "s3vectors:PutVectors",
      "s3vectors:GetVectors",
      "s3vectors:DeleteVectors",
      "s3vectors:QueryVectors",
      "s3vectors:GetIndex",
    ]
    resources = [aws_s3vectors_index.ordinance.index_arn]
  }

  statement {
    sid    = "DecryptCorpus"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey",
    ]
    resources = [aws_kms_key.corpus.arn]
  }
}

resource "aws_iam_role_policy" "knowledge_base" {
  name   = "tow-ordinance-knowledge-base"
  role   = aws_iam_role.knowledge_base.id
  policy = data.aws_iam_policy_document.knowledge_base.json
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "ask" {
  name               = "tow-ordinance-ask"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

data "aws_iam_policy_document" "ask" {
  statement {
    sid    = "Logs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.ask.arn}:*"]
  }

  statement {
    sid     = "Guardrail"
    effect  = "Allow"
    actions = ["bedrock:ApplyGuardrail"]
    resources = [
      aws_bedrock_guardrail.scope.guardrail_arn,
      aws_bedrock_guardrail.grounding.guardrail_arn,
    ]
  }

  statement {
    sid       = "Retrieve"
    effect    = "Allow"
    actions   = ["bedrock:Retrieve"]
    resources = [aws_bedrockagent_knowledge_base.ordinance.arn]
  }

  statement {
    sid    = "Converse"
    effect = "Allow"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:Converse",
    ]
    resources = [
      "arn:aws:bedrock:${var.aws_region}::foundation-model/${local.foundation_model_id}",
      "arn:aws:bedrock:*::foundation-model/${local.foundation_model_id}",
      "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.generator_model_id}",
    ]
  }
}

resource "aws_iam_role_policy" "ask" {
  name   = "tow-ordinance-ask"
  role   = aws_iam_role.ask.id
  policy = data.aws_iam_policy_document.ask.json
}
