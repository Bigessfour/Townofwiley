# Ordinance assistant

Town account `818904800844`, profile `tow`, region `us-east-2`. This root is separate from `environments/town-production`, which still expects the legacy personal account.

The data source uses **hierarchical** chunking (parent 1500 tokens, child 300, overlap 60). That choice cannot be edited later. Changing it means deleting `aws_bedrockagent_data_source.ordinance` and creating it again. Ingestion does not use a foundation model to parse tables.

The public API is a REST API so it can carry a usage plan and a regional WAF per-IP limit. The API key is a throttle token for the website, not an AWS credential.

## Before apply

1. `aws sts get-caller-identity --profile tow` returns `818904800844`.
2. Titan Text Embeddings v2 and the generator (Nova Lite, or Claude Haiku if Nova Lite is not enabled) are enabled in `us-east-2`. Set `generator_model_id` to that model id or inference profile.
3. Code review this stack. Apply only after an explicit yes.

## Apply

```bash
cd infrastructure/terraform/stacks/ordinance-assistant/bootstrap
terraform init
terraform apply

cd ..
cp backend.hcl.example backend.hcl
terraform init -backend-config=backend.hcl
terraform apply
```

Do not run this from the legacy personal-account workspace.

## Upload

Section files are produced by `scripts/ordinances/split_sections.py` into the Desktop `ingest/source` folder. After apply:

```bash
aws s3 sync "$HOME/Desktop/Town of Wiley Ordinances/ingest/source" \
  s3://tow-ordinance-source-818904800844/source/ \
  --profile tow --region us-east-2

# Originals of the ingested chapters and Ordinance 2024-2. Resolutions are not uploaded.
# scripts/ordinances/publish_corpus.sh copies those files to raw/ when CONFIRM=yes.

aws bedrock-agent start-ingestion-job \
  --profile tow --region us-east-2 \
  --knowledge-base-id "$(terraform output -raw knowledge_base_id)" \
  --data-source-id "$(terraform output -raw data_source_id)"
```

`raw/` is not a knowledge-base prefix. Chapter 19, Chapter 20, the scanned code PDF, and resolutions are not in `source/`.
