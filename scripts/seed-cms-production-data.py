#!/usr/bin/env python3
"""Seed production Gen1 CMS rows: OfficialContact stable IDs and SiteCopy keys."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

API_ID = "j7b2x3sh7rcezekekkxxiak7hi"
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")
PROFILE = os.environ.get("AWS_PROFILE", "townofwiley")
OFFICIAL_CONTACT_TABLE = "OfficialContact-j7b2x3sh7rcezekekkxxiak7hi-main"
SITECOPY_TABLE = "SiteCopy-j7b2x3sh7rcezekekkxxiak7hi-main"
ENDPOINT = os.environ.get(
    "APPSYNC_CMS_ENDPOINT",
    "https://327diwc6cvdqjocdudvrdv7wwu.appsync-api.us-east-2.amazonaws.com/graphql",
).strip()
API_KEY = (
    os.environ.get("APPSYNC_CMS_API_KEY", "").strip()
    or os.environ.get("APPSYNC_API_KEY", "").strip()
)
DRY_RUN = "--dry-run" in sys.argv
ENV = {**os.environ, "AWS_PROFILE": PROFILE, "AWS_DEFAULT_REGION": REGION}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def aws(*args: str) -> None:
    cmd = ["aws", *args, "--region", REGION]
    if DRY_RUN:
        print("DRY", " ".join(cmd))
        return
    subprocess.run(cmd, env=ENV, check=True)


def put_dynamo(table: str, item: dict) -> None:
    aws("dynamodb", "put-item", "--table-name", table, "--item", json.dumps(item))


def seed_official_contacts(ts: str) -> None:
    rows = [
        {
            "id": {"S": "town-information"},
            "label": {"S": "Town Information"},
            "value": {"S": "(719) 829-4974"},
            "detail": {
                "S": "Wiley Town Hall, 304 Main Street. Call ahead if you would like time on the City Council agenda or need clerk assistance."
            },
            "href": {"S": "tel:+17198294974"},
            "displayOrder": {"N": "0"},
            "__typename": {"S": "OfficialContact"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
        {
            "id": {"S": "city-clerk"},
            "label": {"S": "City Clerk"},
            "value": {"S": "Deb Dillon"},
            "detail": {
                "S": "Clerk services, meeting packets, records coordination, and agenda planning support."
            },
            "href": {"S": "mailto:deb.dillon@townofwiley.gov"},
            "linkLabel": {"S": "deb.dillon@townofwiley.gov"},
            "displayOrder": {"N": "2"},
            "__typename": {"S": "OfficialContact"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
    ]
    for item in rows:
        print(f"Upsert OfficialContact id={item['id']['S']}")
        put_dynamo(OFFICIAL_CONTACT_TABLE, item)


def seed_sitecopy(ts: str) -> None:
    rows = [
        {
            "id": {"S": "topTasksKicker"},
            "key": {"S": "topTasksKicker"},
            "valueEn": {"S": "Quick Tasks"},
            "valueEs": {"S": "Tareas rapidas"},
            "active": {"BOOL": True},
            "displayOrder": {"N": "1"},
            "__typename": {"S": "SiteCopy"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
        {
            "id": {"S": "topTasksHeading"},
            "key": {"S": "topTasksHeading"},
            "valueEn": {"S": "How do I..."},
            "valueEs": {"S": "Como puedo..."},
            "active": {"BOOL": True},
            "displayOrder": {"N": "2"},
            "__typename": {"S": "SiteCopy"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
    ]
    for item in rows:
        print(f"Upsert SiteCopy key={item['key']['S']}")
        put_dynamo(SITECOPY_TABLE, item)


def verify_graphql() -> None:
    import urllib.request

    queries = {
        "listOfficialContacts": (
            "query { listOfficialContacts(limit: 10) { items { id label value } } }"
        ),
        "listSiteCopies": (
            "query { listSiteCopies(limit: 10) { items { id key valueEn valueEs active } } }"
        ),
    }
    for label, q in queries.items():
        req = urllib.request.Request(
            ENDPOINT,
            data=json.dumps({"query": q}).encode(),
            headers={"Content-Type": "application/json", "x-api-key": API_KEY},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
        print(f"\n{label}:")
        print(json.dumps(body, indent=2)[:1200])
        if body.get("errors"):
            raise RuntimeError(f"{label} failed: {body['errors']}")


def main() -> int:
    ts = now_iso()
    seed_official_contacts(ts)
    seed_sitecopy(ts)
    if not DRY_RUN:
        if not API_KEY:
            print("Skipping GraphQL verify: set APPSYNC_CMS_API_KEY or APPSYNC_API_KEY")
        else:
            verify_graphql()
    print("CMS production seed complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
