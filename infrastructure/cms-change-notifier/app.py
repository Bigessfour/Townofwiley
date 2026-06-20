from __future__ import annotations

import json
import os
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Protocol

AUDIT_PK = "ENTRY"
MAX_SNAPSHOT_BYTES = 350_000


def deserialize_dynamo_item(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not raw:
        return {}

    def decode(value: dict[str, Any]) -> Any:
        if "S" in value:
            return value["S"]
        if "N" in value:
            number = value["N"]
            return int(number) if "." not in number else float(number)
        if "BOOL" in value:
            return value["BOOL"]
        if "NULL" in value:
            return None
        if "M" in value:
            return {key: decode(nested) for key, nested in value["M"].items()}
        if "L" in value:
            return [decode(nested) for nested in value["L"]]
        return None

    return {key: decode(value) for key, value in raw.items()}


class AuditLogGateway(Protocol):
    def put_entry(self, *, item: dict[str, Any]) -> None: ...

    def list_recent(self, *, limit: int) -> list[dict[str, Any]]: ...


class DynamoAuditLogGateway:
    def __init__(self, table_name: str, client: Any) -> None:
        self._table_name = table_name
        self._client = client

    def put_entry(self, *, item: dict[str, Any]) -> None:
        self._client.put_item(TableName=self._table_name, Item=item)

    def list_recent(self, *, limit: int) -> list[dict[str, Any]]:
        response = self._client.query(
            TableName=self._table_name,
            KeyConditionExpression="pk = :pk",
            ExpressionAttributeValues={":pk": {"S": AUDIT_PK}},
            ScanIndexForward=False,
            Limit=max(1, min(limit, 100)),
        )
        return [_deserialize_item(entry) for entry in response.get("Items", [])]


def _deserialize_item(raw: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in raw.items():
        if "S" in value:
            out[key] = value["S"]
        elif "N" in value:
            out[key] = value["N"]
        elif "BOOL" in value:
            out[key] = value["BOOL"]
        elif "M" in value:
            out[key] = {k: list(v.values())[0] for k, v in value["M"].items()}
    return out


def _serialize_item(item: dict[str, Any]) -> dict[str, Any]:
    serialized: dict[str, Any] = {}
    for key, value in item.items():
        if isinstance(value, bool):
            serialized[key] = {"BOOL": value}
        elif isinstance(value, (int, float)):
            serialized[key] = {"N": str(value)}
        elif isinstance(value, dict):
            serialized[key] = {
                "S": json.dumps(value, separators=(",", ":"), ensure_ascii=False)[
                    :MAX_SNAPSHOT_BYTES
                ],
            }
        else:
            serialized[key] = {"S": str(value)}
    return serialized


def table_name_from_arn(arn: str) -> str:
    marker = ":table/"
    if marker in arn:
        after_table = arn.split(marker, 1)[1]
        return after_table.split("/", 1)[0]
    return arn.split("/")[-1]


def model_name_from_table(table_name: str, suffix: str) -> str | None:
    if not table_name.endswith(suffix):
        return None
    prefix = table_name[: -len(suffix)]
    if not prefix or prefix.endswith("-"):
        return None
    return prefix


def summarize_record(record: dict[str, Any] | None) -> str:
    if not record:
        return "(deleted)"
    for key in ("title", "label", "lineEn", "name", "townName", "key", "id"):
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()[:200]
    return str(record.get("id", "(record)"))[:200]


def trim_snapshot(record: dict[str, Any] | None) -> dict[str, Any]:
    if not record:
        return {}
    encoded = json.dumps(record, default=str, ensure_ascii=False)
    if len(encoded.encode("utf-8")) <= MAX_SNAPSHOT_BYTES:
        return record
    return {"id": record.get("id"), "truncated": True}


@dataclass(frozen=True)
class StreamMapperConfig:
    table_suffix: str
    ignored_models: frozenset[str]


@dataclass
class AuditEntry:
    model_name: str
    record_id: str
    operation: str
    summary: str
    changed_fields: list[str]
    snapshot: dict[str, Any]
    staff_email: str


class CmsChangeStreamMapper:
    def __init__(self, config: StreamMapperConfig) -> None:
        self._config = config

    def map_event(self, record: dict[str, Any]) -> AuditEntry | None:
        event_name = str(record.get("eventName", "")).upper()
        if event_name not in {"INSERT", "MODIFY", "REMOVE"}:
            return None

        arn = str(record.get("eventSourceARN", ""))
        table = table_name_from_arn(arn) if arn else ""
        model_name = model_name_from_table(table, self._config.table_suffix)
        if not model_name or model_name in self._config.ignored_models:
            return None

        new_image = deserialize_dynamo_item(record.get("dynamodb", {}).get("NewImage"))
        old_image = deserialize_dynamo_item(record.get("dynamodb", {}).get("OldImage"))
        payload = new_image if event_name != "REMOVE" else old_image
        record_id = str(payload.get("id", "")).strip()
        if not record_id:
            return None

        changed_fields = sorted(
            key
            for key in set(old_image.keys()) | set(new_image.keys())
            if old_image.get(key) != new_image.get(key)
        )

        return AuditEntry(
            model_name=model_name,
            record_id=record_id,
            operation=event_name,
            summary=summarize_record(payload),
            changed_fields=changed_fields,
            snapshot=trim_snapshot(payload if event_name != "REMOVE" else old_image),
            staff_email=str(
                payload.get("updatedBy") or payload.get("_lastChangedBy") or "unknown"
            ),
        )


class CmsAuditWriter:
    def __init__(self, gateway: AuditLogGateway) -> None:
        self._gateway = gateway

    def write(self, entry: AuditEntry) -> None:
        now = datetime.now(tz=UTC)
        stamp = now.isoformat()
        item = {
            "pk": AUDIT_PK,
            "sk": f"{stamp}#{uuid.uuid4().hex[:8]}",
            "timestamp": stamp,
            "modelName": entry.model_name,
            "recordId": entry.record_id,
            "operation": entry.operation,
            "summary": entry.summary,
            "changedFields": json.dumps(entry.changed_fields),
            "staffEmail": entry.staff_email,
            "snapshot": entry.snapshot,
        }
        self._gateway.put_entry(item=_serialize_item(item))


def load_stream_config_from_env(
    environ: dict[str, str] | None = None,
) -> StreamMapperConfig:
    env = environ if environ is not None else os.environ
    suffix = env.get("CMS_TABLE_SUFFIX", "-j7b2x3sh7rcezekekkxxiak7hi-main").strip()
    ignored = frozenset(
        item.strip()
        for item in env.get("CMS_AUDIT_IGNORED_MODELS", "EmailAlias").split(",")
        if item.strip()
    )
    return StreamMapperConfig(table_suffix=suffix, ignored_models=ignored)


def stream_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    del context
    import boto3

    table_name = os.environ.get("AUDIT_LOG_TABLE", "TownOfWileyCmsAuditLog")
    mapper = CmsChangeStreamMapper(load_stream_config_from_env())
    writer = CmsAuditWriter(DynamoAuditLogGateway(table_name, boto3.client("dynamodb")))
    processed = 0
    for record in event.get("Records", []):
        mapped = mapper.map_event(record)
        if mapped is None:
            continue
        writer.write(mapped)
        processed += 1
    return {"processed": processed}


def http_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    del context
    import boto3
    from jwt_utils import assert_staff_from_event, cors_headers, json_response

    origin = (event.get("headers") or {}).get("origin", "")
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": cors_headers(origin), "body": ""}
    if not assert_staff_from_event(event):
        return json_response(401, {"error": "Staff sign-in required."}, origin)

    path = event.get("requestContext", {}).get("http", {}).get("path", "/")
    if not path.endswith("/recent"):
        return json_response(404, {"error": "Not found."}, origin)

    limit_raw = (event.get("queryStringParameters") or {}).get("limit", "25")
    try:
        limit = int(limit_raw)
    except ValueError:
        limit = 25

    table_name = os.environ.get("AUDIT_LOG_TABLE", "TownOfWileyCmsAuditLog")
    gateway = DynamoAuditLogGateway(table_name, boto3.client("dynamodb"))
    items = gateway.list_recent(limit=limit)
    return json_response(200, {"items": items}, origin)
