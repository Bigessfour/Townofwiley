from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import UTC, datetime
from typing import Any, Protocol

PUBLIC_CMS_CORE_QUERY = """query GetPublicCmsCoreContent {
  listSiteSettings(limit: 1) {
    items {
      townName pageTitle heroEyebrow heroStatus heroTitle heroMessage heroSubtext
      heroImageUrl welcomeLabel welcomeHeading welcomeBody welcomeCaption
    }
  }
  listAlertBanners(limit: 20) {
    items { id enabled label title detail linkLabel linkHref updatedAt }
  }
  listAnnouncements(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items {
      id title date detail announcementKind attachmentKey priority imageUrl active
    }
  }
  listEvents(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items { id title description location start end active }
  }
  listOfficialContacts(limit: 50) {
    items { id label value detail href linkLabel displayOrder }
  }
}"""

PUBLIC_CMS_EXTENDED_QUERY = """query GetPublicCmsExtendedContent {
  listBusinesses(filter: { active: { eq: true } }, limit: 100) {
    items {
      id name phone address website description imageUrl active displayOrder
    }
  }
  listPublicDocuments(filter: { active: { eq: true } }, limit: 100) {
    items {
      id title summary sectionId status format href downloadFileName keywords active displayOrder
    }
  }
  listExternalNewsLinks(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items { id title url source active displayOrder }
  }
  listLeadershipRosterEntries(filter: { and: [{ active: { eq: true } }] }, limit: 50) {
    items { id groupId displayOrder lineEn lineEs active }
  }
  listSiteCopies(filter: { and: [{ active: { eq: true } }] }, limit: 200) {
    items { id key valueEn valueEs description active }
  }
}"""

NO_CACHE = "no-cache, no-store, must-revalidate"


class ObjectStorageGateway(Protocol):
    def put_json(self, *, key: str, payload: dict[str, Any]) -> None: ...


class S3ObjectStorageGateway:
    def __init__(self, bucket: str, client: Any) -> None:
        self._bucket = bucket
        self._client = client

    def put_json(self, *, key: str, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=body.encode("utf-8"),
            ContentType="application/json",
            CacheControl=NO_CACHE,
        )


def post_graphql(*, endpoint: str, api_key: str, query: str) -> dict[str, Any]:
    request = urllib.request.Request(
        endpoint,
        data=json.dumps({"query": query}).encode("utf-8"),
        headers={"content-type": "application/json", "x-api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AppSync HTTP {error.code}: {body[:500]}") from error

    errors = payload.get("errors") or []
    if errors:
        messages = [
            str(item.get("message", "")).strip()
            for item in errors
            if isinstance(item, dict)
        ]
        raise RuntimeError(" ".join(message for message in messages if message))

    data = payload.get("data")
    return data if isinstance(data, dict) else {}


def build_snapshot(
    core_data: dict[str, Any], extended_data: dict[str, Any], *, build_sha: str | None
) -> dict[str, Any]:
    saved_at = datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")
    return {
        "version": 1,
        "savedAt": saved_at,
        "buildSha": build_sha,
        "siteSettings": (core_data.get("listSiteSettings") or {}).get("items", [None])[
            0
        ],
        "alertBannerRecords": (core_data.get("listAlertBanners") or {}).get("items")
        or [],
        "noticeRecords": (core_data.get("listAnnouncements") or {}).get("items") or [],
        "eventRecords": (core_data.get("listEvents") or {}).get("items") or [],
        "contactRecords": (core_data.get("listOfficialContacts") or {}).get("items")
        or [],
        "businessRecords": (extended_data.get("listBusinesses") or {}).get("items")
        or [],
        "publicDocumentRecords": (extended_data.get("listPublicDocuments") or {}).get(
            "items"
        )
        or [],
        "externalNewsLinkRecords": (
            extended_data.get("listExternalNewsLinks") or {}
        ).get("items")
        or [],
        "leadershipRosterRecords": (
            extended_data.get("listLeadershipRosterEntries") or {}
        ).get("items")
        or [],
        "siteCopyRecords": (extended_data.get("listSiteCopies") or {}).get("items")
        or [],
    }


def build_revision_manifest(snapshot: dict[str, Any]) -> dict[str, Any]:
    saved_at = str(snapshot.get("savedAt", "")).strip()
    return {"version": 1, "revision": saved_at, "savedAt": saved_at}


def fetch_public_cms_snapshot(*, endpoint: str, api_key: str) -> dict[str, Any]:
    core_data = post_graphql(
        endpoint=endpoint, api_key=api_key, query=PUBLIC_CMS_CORE_QUERY
    )
    extended_data = post_graphql(
        endpoint=endpoint, api_key=api_key, query=PUBLIC_CMS_EXTENDED_QUERY
    )
    build_sha = os.environ.get("CMS_SNAPSHOT_BUILD_SHA", "").strip() or None
    return build_snapshot(core_data, extended_data, build_sha=build_sha)


def publish_public_cms_snapshot(
    *,
    storage: ObjectStorageGateway,
    endpoint: str,
    api_key: str,
) -> dict[str, Any]:
    snapshot = fetch_public_cms_snapshot(endpoint=endpoint, api_key=api_key)
    revision = build_revision_manifest(snapshot)
    storage.put_json(key="cms-snapshot.json", payload=snapshot)
    storage.put_json(key="cms-revision.json", payload=revision)
    return {"savedAt": snapshot["savedAt"], "revision": revision["revision"]}


def publish_public_cms_snapshot_from_env(
    environ: dict[str, str] | None = None,
) -> dict[str, Any] | None:
    env = environ if environ is not None else os.environ
    if env.get("CMS_SNAPSHOT_PUBLISH_ENABLED", "true").strip().lower() in {
        "0",
        "false",
        "no",
    }:
        return None

    bucket = env.get("CMS_SNAPSHOT_BUCKET", "").strip()
    endpoint = env.get("APPSYNC_CMS_ENDPOINT", "").strip()
    api_key = env.get("APPSYNC_CMS_API_KEY", "").strip()
    if not bucket or not endpoint or not api_key:
        return None

    import boto3

    storage = S3ObjectStorageGateway(bucket, boto3.client("s3"))
    return publish_public_cms_snapshot(
        storage=storage, endpoint=endpoint, api_key=api_key
    )
