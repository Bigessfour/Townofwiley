from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Protocol

DEFAULT_API_ID = "j7b2x3sh7rcezekekkxxiak7hi"


class AppSyncGateway(Protocol):
    def delete_api_key(self, *, api_id: str, key_id: str) -> None: ...
    def list_api_keys(self, *, api_id: str) -> list[dict[str, Any]]: ...


@dataclass(frozen=True)
class DeletionConfig:
    api_id: str
    key_ids: tuple[str, ...]
    keep_key_ids: tuple[str, ...]


@dataclass
class DeletionResult:
    deleted: list[str]
    skipped: list[str]
    errors: list[str]


class Boto3AppSyncGateway:
    def __init__(self, client: Any) -> None:
        self._client = client

    def delete_api_key(self, *, api_id: str, key_id: str) -> None:
        self._client.delete_api_key(apiId=api_id, id=key_id)

    def list_api_keys(self, *, api_id: str) -> list[dict[str, Any]]:
        response = self._client.list_api_keys(apiId=api_id)
        return list(response.get("apiKeys", []))


class AppSyncKeyDeletionJob:
    def __init__(self, config: DeletionConfig, appsync_gateway: AppSyncGateway) -> None:
        self._config = config
        self._appsync = appsync_gateway

    def run(self) -> DeletionResult:
        deleted: list[str] = []
        skipped: list[str] = []
        errors: list[str] = []

        existing_ids = {
            str(entry.get("id", "")).strip()
            for entry in self._appsync.list_api_keys(api_id=self._config.api_id)
        }

        for key_id in self._config.key_ids:
            normalized = key_id.strip()
            if not normalized:
                continue
            if normalized in self._config.keep_key_ids:
                skipped.append(normalized)
                continue
            if normalized not in existing_ids:
                skipped.append(normalized)
                continue
            try:
                self._appsync.delete_api_key(
                    api_id=self._config.api_id, key_id=normalized
                )
                deleted.append(normalized)
            except Exception as error:  # noqa: BLE001 — surface per-key failures
                errors.append(f"{normalized}: {error}")

        return DeletionResult(deleted=deleted, skipped=skipped, errors=errors)


def load_config_from_env(environ: dict[str, str] | None = None) -> DeletionConfig:
    env = environ if environ is not None else os.environ
    raw_ids = env.get("APPSYNC_KEY_IDS_TO_DELETE", "").strip()
    raw_keep = env.get("APPSYNC_KEY_IDS_TO_KEEP", "").strip()
    key_ids = tuple(item.strip() for item in raw_ids.split(",") if item.strip())
    keep_key_ids = tuple(item.strip() for item in raw_keep.split(",") if item.strip())
    return DeletionConfig(
        api_id=env.get("APPSYNC_API_ID", DEFAULT_API_ID).strip() or DEFAULT_API_ID,
        key_ids=key_ids,
        keep_key_ids=keep_key_ids,
    )


def handler(event: dict[str, Any] | None, context: Any) -> dict[str, Any]:
    del event, context

    import boto3

    config = load_config_from_env()
    job = AppSyncKeyDeletionJob(
        config=config,
        appsync_gateway=Boto3AppSyncGateway(boto3.client("appsync")),
    )
    result = job.run()
    return {
        "deleted": result.deleted,
        "skipped": result.skipped,
        "errors": result.errors,
    }
