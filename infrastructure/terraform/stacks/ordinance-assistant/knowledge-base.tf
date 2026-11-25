resource "aws_bedrockagent_knowledge_base" "ordinance" {
  name     = "tow-ordinance-code"
  role_arn = aws_iam_role.knowledge_base.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.embedding_model_id}"
      embedding_model_configuration {
        bedrock_embedding_model_configuration {
          dimensions          = var.embedding_dimensions
          embedding_data_type = "FLOAT32"
        }
      }
    }
  }

  storage_configuration {
    type = "S3_VECTORS"
    s3_vectors_configuration {
      index_arn = aws_s3vectors_index.ordinance.index_arn
    }
  }

  depends_on = [aws_iam_role_policy.knowledge_base]
}

# Chunking cannot be edited after this data source is created.
# S3 Vectors rejects a metadata string over 2048 bytes, and Bedrock stores
# each chunk's text there. Fixed chunks of 200 tokens stay under that limit.
# A parent chunk of 1500 tokens does not.
resource "aws_bedrockagent_data_source" "ordinance" {
  knowledge_base_id    = aws_bedrockagent_knowledge_base.ordinance.id
  name                 = "tow-ordinance-source"
  data_deletion_policy = "DELETE"

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn         = aws_s3_bucket.corpus.arn
      inclusion_prefixes = ["source/"]
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens         = 200
        overlap_percentage = 15
      }
    }
  }
}
