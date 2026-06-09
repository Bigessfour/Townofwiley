#!/usr/bin/env python3
"""
Add SiteCopy model to live Gen1 AppSync API (townofwiley-main).

Clones ExternalNewsLink GraphQL types/resolvers and creates DynamoDB table
SiteCopy-j7b2x3sh7rcezekekkxxiak7hi-main with apiKey read + Cognito userPool CRUD.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

API_ID = os.environ.get("APPSYNC_API_ID", "j7b2x3sh7rcezekekkxxiak7hi")
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")
PROFILE = os.environ.get("AWS_PROFILE", "townofwiley")
TABLE_NAME = os.environ.get("SITECOPY_TABLE", "SiteCopy-j7b2x3sh7rcezekekkxxiak7hi-main")
SITECOPY_ROLE_NAME = f"SiteCopyIAMRsitecopy-{API_ID}-main"
TEMPLATE_MODEL = "ExternalNewsLink"
TARGET_MODEL = "SiteCopy"
TEMPLATE_DS = "ExternalNewsLinkTable"
TARGET_DS = "SiteCopyTable"
REPO_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = REPO_ROOT / "scripts" / "gen1-appsync-schema.graphql"
SITECOPY_BLOCK_PATH = REPO_ROOT / "scripts" / "sitecopy-gen1-schema-block.graphql"
MERGED_SCHEMA_PATH = REPO_ROOT / "scripts" / "gen1-appsync-schema-with-sitecopy.graphql"
DRY_RUN = "--dry-run" in sys.argv

ENV = {**os.environ, "AWS_PROFILE": PROFILE, "AWS_DEFAULT_REGION": REGION}


def aws(*args: str, input_text: str | None = None) -> dict | str:
    cmd = ["aws", *args, "--region", REGION, "--output", "json"]
    proc = subprocess.run(
        cmd,
        env=ENV,
        input=input_text,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"aws {' '.join(args)} failed:\n{proc.stderr or proc.stdout}")
    if proc.stdout.strip():
        return json.loads(proc.stdout)
    return {}


def aws_text(*args: str) -> str:
    cmd = ["aws", *args, "--region", REGION, "--output", "text"]
    proc = subprocess.run(cmd, env=ENV, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError(f"aws {' '.join(args)} failed:\n{proc.stderr or proc.stdout}")
    return proc.stdout.strip()


def table_exists(name: str) -> bool:
    try:
        aws("dynamodb", "describe-table", "--table-name", name)
        return True
    except RuntimeError:
        return False


def ensure_sitecopy_table() -> None:
    if table_exists(TABLE_NAME):
        print(f"DynamoDB table exists: {TABLE_NAME}")
        return
    print(f"Creating DynamoDB table {TABLE_NAME}…")
    if DRY_RUN:
        return
    aws(
        "dynamodb",
        "create-table",
        "--table-name",
        TABLE_NAME,
        "--attribute-definitions",
        "AttributeName=id,AttributeType=S",
        "--key-schema",
        "AttributeName=id,KeyType=HASH",
        "--billing-mode",
        "PAY_PER_REQUEST",
        "--tags",
        f"Key=Project,Value=townofwiley",
        f"Key=Model,Value=SiteCopy",
    )
    waiter = subprocess.run(
        [
            "aws",
            "dynamodb",
            "wait",
            "table-exists",
            "--table-name",
            TABLE_NAME,
            "--region",
            REGION,
        ],
        env=ENV,
        check=True,
    )
    del waiter


def ensure_sitecopy_service_role() -> str:
    role_arn = f"arn:aws:iam::570912405222:role/{SITECOPY_ROLE_NAME}"
    trust = json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "appsync.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }
            ],
        }
    )
    try:
        aws("iam", "get-role", "--role-name", SITECOPY_ROLE_NAME)
        print(f"IAM role exists: {SITECOPY_ROLE_NAME}")
    except RuntimeError:
        print(f"Creating IAM role {SITECOPY_ROLE_NAME}")
        if DRY_RUN:
            return role_arn
        aws(
            "iam",
            "create-role",
            "--role-name",
            SITECOPY_ROLE_NAME,
            "--assume-role-policy-document",
            trust,
        )
    policy = json.dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Action": [
                        "dynamodb:BatchGetItem",
                        "dynamodb:BatchWriteItem",
                        "dynamodb:PutItem",
                        "dynamodb:DeleteItem",
                        "dynamodb:GetItem",
                        "dynamodb:Scan",
                        "dynamodb:Query",
                        "dynamodb:UpdateItem",
                        "dynamodb:ConditionCheckItem",
                        "dynamodb:DescribeTable",
                        "dynamodb:GetRecords",
                        "dynamodb:GetShardIterator",
                    ],
                    "Resource": [
                        f"arn:aws:dynamodb:{REGION}:570912405222:table/{TABLE_NAME}",
                        f"arn:aws:dynamodb:{REGION}:570912405222:table/{TABLE_NAME}/*",
                    ],
                }
            ],
        }
    )
    if not DRY_RUN:
        aws(
            "iam",
            "put-role-policy",
            "--role-name",
            SITECOPY_ROLE_NAME,
            "--policy-name",
            "DynamoDBAccess",
            "--policy-document",
            policy,
        )
    return role_arn


def ensure_data_source() -> str:
    role_arn = ensure_sitecopy_service_role()
    sources = aws("appsync", "list-data-sources", "--api-id", API_ID).get("dataSources", [])
    dynamodb_config = json.dumps({"tableName": TABLE_NAME, "awsRegion": REGION})
    for source in sources:
        if source.get("name") == TARGET_DS:
            if source.get("serviceRoleArn") != role_arn:
                print(f"Updating {TARGET_DS} service role -> {SITECOPY_ROLE_NAME}")
                if not DRY_RUN:
                    aws(
                        "appsync",
                        "update-data-source",
                        "--api-id",
                        API_ID,
                        "--name",
                        TARGET_DS,
                        "--type",
                        "AMAZON_DYNAMODB",
                        "--service-role-arn",
                        role_arn,
                        "--dynamodb-config",
                        dynamodb_config,
                    )
            else:
                print(f"Data source exists: {TARGET_DS}")
            return source["dataSourceArn"]
    print(f"Creating data source {TARGET_DS} -> {TABLE_NAME}")
    if DRY_RUN:
        return f"arn:aws:appsync:{REGION}:570912405222:apis/{API_ID}/dataSources/{TARGET_DS}"
    created = aws(
        "appsync",
        "create-data-source",
        "--api-id",
        API_ID,
        "--name",
        TARGET_DS,
        "--type",
        "AMAZON_DYNAMODB",
        "--service-role-arn",
        role_arn,
        "--dynamodb-config",
        dynamodb_config,
    )
    return created["dataSource"]["dataSourceArn"]


def replace_model_names(text: str) -> str:
    # Longest keys first so listExternalNewsLinks -> listSiteCopies, not listSiteCopys.
    mapping = (
        ("ExternalNewsLinks", "SiteCopies"),
        ("externalNewsLinks", "siteCopies"),
        ("ExternalNewsLink", "SiteCopy"),
        ("externalNewsLink", "siteCopy"),
    )
    out = text
    for old, new in mapping:
        out = out.replace(old, new)
    return out


def merge_schema() -> str:
    if not SCHEMA_PATH.exists():
        raise RuntimeError(f"Export base schema first: python scripts/export-appsync-schema.py")
    base = SCHEMA_PATH.read_text(encoding="utf-8")
    if "type SiteCopy" in base and "listSiteCopies" in base:
        print("Schema already contains SiteCopy — skipping schema merge")
        MERGED_SCHEMA_PATH.write_text(base, encoding="utf-8")
        return base

    sitecopy_block = SITECOPY_BLOCK_PATH.read_text(encoding="utf-8").strip()
    marker = "type Mutation"
    if marker not in base:
        raise RuntimeError("Could not find type Mutation in exported schema")

    base = base.replace(marker, f"{sitecopy_block}\n\n{marker}", 1)

    base = base.replace(
        "listExternalNewsLinks(filter: ModelExternalNewsLinkFilterInput,limit: Int,nextToken: String ): ModelExternalNewsLinkConnection\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n}",
        "listExternalNewsLinks(filter: ModelExternalNewsLinkFilterInput,limit: Int,nextToken: String ): ModelExternalNewsLinkConnection\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n\ngetSiteCopy(id: ID! ): SiteCopy\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n\nlistSiteCopies(filter: ModelSiteCopyFilterInput,limit: Int,nextToken: String ): ModelSiteCopyConnection\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n}",
    )
    base = base.replace(
        "deleteExternalNewsLink(input: DeleteExternalNewsLinkInput!,condition: ModelExternalNewsLinkConditionInput ): ExternalNewsLink\n@aws_iam\n@aws_cognito_user_pools\n}",
        "deleteExternalNewsLink(input: DeleteExternalNewsLinkInput!,condition: ModelExternalNewsLinkConditionInput ): ExternalNewsLink\n@aws_iam\n@aws_cognito_user_pools\n\ncreateSiteCopy(input: CreateSiteCopyInput!,condition: ModelSiteCopyConditionInput ): SiteCopy\n@aws_iam\n@aws_cognito_user_pools\n\nupdateSiteCopy(input: UpdateSiteCopyInput!,condition: ModelSiteCopyConditionInput ): SiteCopy\n@aws_iam\n@aws_cognito_user_pools\n\ndeleteSiteCopy(input: DeleteSiteCopyInput!,condition: ModelSiteCopyConditionInput ): SiteCopy\n@aws_iam\n@aws_cognito_user_pools\n}",
    )
    base = base.replace(
        "onDeleteExternalNewsLink(filter: ModelSubscriptionExternalNewsLinkFilterInput ): ExternalNewsLink\n@aws_subscribe(mutations: [\"deleteExternalNewsLink\"])\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n}",
        "onDeleteExternalNewsLink(filter: ModelSubscriptionExternalNewsLinkFilterInput ): ExternalNewsLink\n@aws_subscribe(mutations: [\"deleteExternalNewsLink\"])\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n\nonCreateSiteCopy(filter: ModelSubscriptionSiteCopyFilterInput ): SiteCopy\n@aws_subscribe(mutations: [\"createSiteCopy\"])\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n\nonUpdateSiteCopy(filter: ModelSubscriptionSiteCopyFilterInput ): SiteCopy\n@aws_subscribe(mutations: [\"updateSiteCopy\"])\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n\nonDeleteSiteCopy(filter: ModelSubscriptionSiteCopyFilterInput ): SiteCopy\n@aws_subscribe(mutations: [\"deleteSiteCopy\"])\n@aws_api_key\n@aws_iam\n@aws_cognito_user_pools\n}",
    )

    MERGED_SCHEMA_PATH.write_text(base, encoding="utf-8")
    print(f"Wrote merged schema: {MERGED_SCHEMA_PATH}")
    return base


def wait_schema_status() -> None:
    while True:
        raw = aws_text("appsync", "get-schema-creation-status", "--api-id", API_ID)
        status = raw.split()[-1] if raw else ""
        print(f"Schema status: {raw}")
        if status == "SUCCESS":
            return
        if status in {"FAILED", "NOT_APPLICABLE"}:
            raise RuntimeError(f"Schema creation failed: {status}")
        time.sleep(3)


def push_schema(definition: str) -> None:
    if "listSiteCopies" not in definition:
        raise RuntimeError("Merged schema missing listSiteCopies")
    MERGED_SCHEMA_PATH.write_text(definition, encoding="utf-8")
    print(f"Starting AppSync schema creation from {MERGED_SCHEMA_PATH} …")
    if DRY_RUN:
        return
    schema_file = MERGED_SCHEMA_PATH.resolve()
    file_arg = f"fileb://{schema_file}"
    aws(
        "appsync",
        "start-schema-creation",
        "--api-id",
        API_ID,
        "--definition",
        file_arg,
    )
    wait_schema_status()


DATA_RESOLVER_FUNCTION_CLONES = (
    ("QueryListExternalNewsLinksDataResolverFn", "QueryListSiteCopiesDataResolverFn"),
    ("QueryGetExternalNewsLinkDataResolverFn", "QueryGetSiteCopyDataResolverFn"),
    ("MutationCreateExternalNewsLinkDataResolverFn", "MutationCreateSiteCopyDataResolverFn"),
    ("MutationUpdateExternalNewsLinkDataResolverFn", "MutationUpdateSiteCopyDataResolverFn"),
    ("MutationDeleteExternalNewsLinkDataResolverFn", "MutationDeleteSiteCopyDataResolverFn"),
)


def list_resolvers() -> list[dict]:
    out: list[dict] = []
    for type_name in ("Query", "Mutation", "Subscription"):
        page = aws("appsync", "list-resolvers", "--api-id", API_ID, "--type-name", type_name)
        out.extend(page.get("resolvers", []))
    return out


def remap_pipeline_config(pipeline_config: dict | None, fn_map: dict[str, str]) -> dict | None:
    if not pipeline_config or not pipeline_config.get("functions"):
        return pipeline_config
    return {"functions": [fn_map.get(fid, fid) for fid in pipeline_config["functions"]]}


def ensure_pipeline_function_mapping() -> dict[str, str]:
    """Clone ExternalNewsLink data-resolver pipeline functions to SiteCopyTable."""
    mapping: dict[str, str] = {}
    functions = aws("appsync", "list-functions", "--api-id", API_ID).get("functions", [])
    by_name = {fn["name"]: fn["functionId"] for fn in functions}

    for template_name, target_name in DATA_RESOLVER_FUNCTION_CLONES:
        template_id = by_name.get(template_name)
        if not template_id:
            print(f"Skip missing template function: {template_name}")
            continue
        if target_name in by_name:
            mapping[template_id] = by_name[target_name]
            print(f"Pipeline function exists: {target_name}")
            continue
        template = aws("appsync", "get-function", "--api-id", API_ID, "--function-id", template_id)[
            "functionConfiguration"
        ]
        print(f"Creating pipeline function: {target_name}")
        if DRY_RUN:
            mapping[template_id] = template_id
            continue
        created = aws(
            "appsync",
            "create-function",
            "--api-id",
            API_ID,
            "--name",
            target_name,
            "--data-source-name",
            TARGET_DS,
            "--function-version",
            template["functionVersion"],
            "--request-mapping-template",
            template["requestMappingTemplate"],
            "--response-mapping-template",
            template["responseMappingTemplate"],
        )
        new_id = created["functionConfiguration"]["functionId"]
        mapping[template_id] = new_id
        by_name[target_name] = new_id
    return mapping


def patch_sitecopy_resolver_pipelines(fn_map: dict[str, str]) -> None:
    for type_name in ("Query", "Mutation", "Subscription"):
        page = aws("appsync", "list-resolvers", "--api-id", API_ID, "--type-name", type_name)
        for summary in page.get("resolvers", []):
            field = summary["fieldName"]
            if not (TARGET_MODEL in field or field.endswith("SiteCopies")):
                continue
            resolver = aws(
                "appsync",
                "get-resolver",
                "--api-id",
                API_ID,
                "--type-name",
                type_name,
                "--field-name",
                field,
            )["resolver"]
            if resolver.get("kind") != "PIPELINE":
                continue
            new_config = remap_pipeline_config(resolver.get("pipelineConfig"), fn_map)
            if new_config == resolver.get("pipelineConfig"):
                continue
            print(f"Patching pipeline for {type_name}.{field}")
            if DRY_RUN:
                continue
            aws(
                "appsync",
                "update-resolver",
                "--api-id",
                API_ID,
                "--type-name",
                type_name,
                "--field-name",
                field,
                "--request-mapping-template",
                resolver["requestMappingTemplate"],
                "--response-mapping-template",
                resolver["responseMappingTemplate"],
                "--kind",
                "PIPELINE",
                "--pipeline-config",
                json.dumps(new_config),
            )


def clone_resolvers(fn_map: dict[str, str]) -> None:
    resolvers = list_resolvers()
    template_fields = [r["fieldName"] for r in resolvers if TEMPLATE_MODEL in r["fieldName"]]
    print(f"Template resolver fields: {', '.join(template_fields)}")
    for field in template_fields:
        target_field = replace_model_names(field)
        type_name = next(r["typeName"] for r in resolvers if r["fieldName"] == field)
        try:
            aws(
                "appsync",
                "get-resolver",
                "--api-id",
                API_ID,
                "--type-name",
                type_name,
                "--field-name",
                target_field,
            )
            print(f"Resolver exists: {type_name}.{target_field}")
            continue
        except RuntimeError:
            pass
        template = aws(
            "appsync",
            "get-resolver",
            "--api-id",
            API_ID,
            "--type-name",
            type_name,
            "--field-name",
            field,
        )["resolver"]
        request = replace_model_names(template["requestMappingTemplate"])
        request = (
            request.replace(TEMPLATE_DS, TARGET_DS).replace(
                f"{TEMPLATE_MODEL}-j7b2x3sh7rcezekekkxxiak7hi-main", TABLE_NAME
            )
        )
        print(f"Creating resolver {type_name}.{target_field}")
        if DRY_RUN:
            continue
        kwargs = [
            "appsync",
            "create-resolver",
            "--api-id",
            API_ID,
            "--type-name",
            type_name,
            "--field-name",
            target_field,
            "--request-mapping-template",
            request,
            "--response-mapping-template",
            template["responseMappingTemplate"],
            "--kind",
            template["kind"],
        ]
        pipeline_config = remap_pipeline_config(template.get("pipelineConfig"), fn_map)
        if pipeline_config and pipeline_config.get("functions"):
            kwargs.extend(["--pipeline-config", json.dumps(pipeline_config)])
        if template.get("dataSourceName"):
            kwargs.extend(["--data-source-name", replace_model_names(template["dataSourceName"])])
        aws(*kwargs)


def resolve_appsync_verify_credentials() -> tuple[str, str] | None:
    endpoint = (
        os.environ.get("APPSYNC_CMS_ENDPOINT", "").strip()
        or os.environ.get("APPSYNC_ENDPOINT", "").strip()
        or "https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql"
    )
    api_key = (
        os.environ.get("APPSYNC_CMS_API_KEY", "").strip()
        or os.environ.get("APPSYNC_API_KEY", "").strip()
    )
    if not api_key:
        secrets_path = REPO_ROOT / "secrets" / "local" / "user-secrets.json"
        if secrets_path.exists():
            secrets = json.loads(secrets_path.read_text(encoding="utf-8"))
            api_key = (secrets.get("cms", {}).get("appSync", {}).get("apiKey") or "").strip()
    if not endpoint or not api_key:
        return None
    return endpoint, api_key


def verify() -> None:
    import urllib.error
    import urllib.request

    creds = resolve_appsync_verify_credentials()
    if not creds:
        print(
            "Skipping verify: set APPSYNC_CMS_API_KEY (or APPSYNC_API_KEY) "
            "to post-deploy check listSiteCopies",
        )
        return

    endpoint, api_key = creds
    query = '{"query":"query { listSiteCopies(limit: 2) { items { id key valueEn active } } }"}'
    req = urllib.request.Request(
        endpoint,
        data=query.encode(),
        headers={"Content-Type": "application/json", "x-api-key": api_key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode())
    print("Verify listSiteCopies:", json.dumps(body, indent=2)[:500])
    if body.get("errors"):
        raise RuntimeError(f"listSiteCopies still failing: {body['errors']}")


def main() -> int:
    if not SCHEMA_PATH.exists():
        raise SystemExit(f"Missing schema export: {SCHEMA_PATH}")
    ensure_sitecopy_table()
    ensure_data_source()
    merged = merge_schema()
    push_schema(merged)
    fn_map = ensure_pipeline_function_mapping()
    clone_resolvers(fn_map)
    patch_sitecopy_resolver_pipelines(fn_map)
    if not DRY_RUN:
        verify()
    print("SiteCopy deploy complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
