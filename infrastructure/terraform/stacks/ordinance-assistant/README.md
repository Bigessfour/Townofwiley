# Ordinance assistant

Town account `818904800844`, profile `tow`, region `us-east-2`. This root is separate from `environments/town-production`, which still expects the legacy personal account.

The data source uses **fixed-size** chunking (200 tokens, 15 percent overlap). That choice cannot be edited later. Changing it means deleting `aws_bedrockagent_data_source.ordinance` and creating it again. Ingestion embeds with Titan Text Embeddings v2. Do not generate vectors locally.

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

## Corpus

`source/` is the only knowledge-base prefix. It includes:

- Municipal code sections for chapters 01, 02, 04, 05, 07, 08, 10, 11, 13, and 15 through 18, from `scripts/ordinances/split_sections.py`. Ordinance 2024-2 (the signed dog ordinance's clean Word text) is already in chapter 07, marked `authority: ordinance-2024-2`.
- `19/`, the Chapter 19 disposition table. It maps old numbers to current sections. It is not a rule.
- `20/`, the Chapter 20 index, one file per letter.
- `ordinances/`, later Wiley ordinances from `Ordinances (NAS)`. Each file's metadata has `authority`, `instrument`, and `adopted`.
- `resolutions/`, Wiley and Wiley Sanitation District resolutions, including supplemental budgets. A later `adopted` year is later authority than an earlier resolution on the same subject.

`scripts/ordinances/expand_corpus.py` writes the disposition table, the index, the later ordinances, and the resolutions. It does not delete the code sections and it does not embed vectors.

Left out on purpose:

- `Reference models/` and the Mountain Village ordinance template. Those are not Wiley law.
- Duplicate drafts and signed scans when a clean Word file of the same instrument already exists. The sales-tax ordinance is the exception: it exists only as a scan, so the existing Vision OCR reads it into markdown and Titan embeds that text.
- `dog.pdf` and `Wiley_Municipal_Code_IN_PROGRESS.pdf`. They repeat the code book that is already split into sections. `raw/` still holds the chapter Word files and is not searched.

A new ingestion job adds and updates documents. Do not delete the knowledge base, the data source, or existing vectors. Do not pass `--delete` to `aws s3 sync`.

## Upload

After apply, from this directory:

```bash
CONFIRM=yes \
  KNOWLEDGE_BASE_ID="$(terraform output -raw knowledge_base_id)" \
  DATA_SOURCE_ID="$(terraform output -raw data_source_id)" \
  bash ../../../../scripts/ordinances/publish_corpus.sh
```

That refreshes the expanded folders, syncs `ingest/source` to `s3://tow-ordinance-source-818904800844/source/`, copies the chapter originals to `raw/`, and starts one Bedrock ingestion job. New files are not searchable until that job finishes. From the repository root, the same steps without the wrapper are:

```bash
python3 scripts/ordinances/expand_corpus.py

aws s3 sync "$HOME/Desktop/Town of Wiley Ordinances/ingest/source" \
  s3://tow-ordinance-source-818904800844/source/ \
  --profile tow --region us-east-2

aws bedrock-agent start-ingestion-job \
  --profile tow --region us-east-2 \
  --knowledge-base-id "$(terraform output -raw knowledge_base_id)" \
  --data-source-id "$(terraform output -raw data_source_id)"
```

The script path above is relative to the repository root for `expand_corpus.py`. `publish_corpus.sh` finds the script itself. Run it only in account `818904800844`.
