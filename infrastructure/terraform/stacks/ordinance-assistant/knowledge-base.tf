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

# Hierarchical chunking cannot be edited after this data source is created.
# Changing it means deleting this resource and creating it again.
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
      chunking_strategy = "HIERARCHICAL"
      hierarchical_chunking_configuration {
        overlap_tokens = 60
        level_configuration {
          max_tokens = 1500
        }
        level_configuration {
          max_tokens = 300
        }
      }
    }
  }
}
