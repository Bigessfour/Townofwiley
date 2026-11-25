resource "aws_s3_bucket" "corpus" {
  bucket = var.corpus_bucket_name
}

resource "aws_s3_bucket_versioning" "corpus" {
  bucket = aws_s3_bucket.corpus.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "corpus" {
  bucket = aws_s3_bucket.corpus.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.corpus.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "corpus" {
  bucket                  = aws_s3_bucket.corpus.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3vectors_vector_bucket" "ordinance" {
  vector_bucket_name = var.vector_bucket_name

  encryption_configuration {
    sse_type    = "aws:kms"
    kms_key_arn = aws_kms_key.corpus.arn
  }
}

resource "aws_s3vectors_index" "ordinance" {
  index_name         = "tow-ordinance-code"
  vector_bucket_name = aws_s3vectors_vector_bucket.ordinance.vector_bucket_name
  data_type          = "float32"
  dimension          = var.embedding_dimensions
  distance_metric    = "cosine"

  encryption_configuration {
    sse_type    = "aws:kms"
    kms_key_arn = aws_kms_key.corpus.arn
  }
}
