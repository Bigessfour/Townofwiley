data "aws_iam_policy_document" "corpus_key" {
  statement {
    sid    = "AccountAdmin"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "CorpusBucket"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
    actions   = ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["s3.${var.aws_region}.amazonaws.com"]
    }
  }

  # S3 Vectors background index work calls KMS as this principal, not s3vectors.amazonaws.com.
  # https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-data-encryption.html
  statement {
    sid    = "VectorBucket"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["indexing.s3vectors.amazonaws.com"]
    }
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:s3vectors:${var.aws_region}:${data.aws_caller_identity.current.account_id}:bucket/*"]
    }
    condition {
      test     = "ForAnyValue:StringEquals"
      variable = "kms:EncryptionContextKeys"
      values   = ["aws:s3vectors:arn", "aws:s3vectors:resource-id"]
    }
  }

  statement {
    sid    = "BedrockIngestion"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }
    actions   = ["kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_kms_key" "corpus" {
  description             = "Town of Wiley ordinance corpus and vector index"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.corpus_key.json
}

resource "aws_kms_alias" "corpus" {
  name          = "alias/tow-ordinance-corpus"
  target_key_id = aws_kms_key.corpus.key_id
}
