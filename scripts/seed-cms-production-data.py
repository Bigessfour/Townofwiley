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
LEADERSHIP_ROSTER_TABLE = "LeadershipRosterEntry-j7b2x3sh7rcezekekkxxiak7hi-main"
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
            "href": {"S": "mailto:clerk@townofwiley.gov"},
            "linkLabel": {"S": "clerk@townofwiley.gov"},
            "displayOrder": {"N": "2"},
            "__typename": {"S": "OfficialContact"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
        {
            "id": {"S": "town-superintendent"},
            "label": {"S": "Town Superintendent"},
            "value": {"S": "Scott Whitman"},
            "detail": {
                "S": "Town operations, public works coordination, and service follow-up."
            },
            "href": {"S": "mailto:clerk@townofwiley.gov"},
            "linkLabel": {"S": "clerk@townofwiley.gov"},
            "displayOrder": {"N": "3"},
            "__typename": {"S": "OfficialContact"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
        {
            "id": {"S": "mayor"},
            "label": {"S": "Mayor"},
            "value": {"S": "Stephen McKitrick"},
            "detail": {
                "S": "Contact the Mayor by email for official town business or council-related questions."
            },
            "href": {"S": "mailto:clerk@townofwiley.gov"},
            "linkLabel": {"S": "clerk@townofwiley.gov"},
            "displayOrder": {"N": "1"},
            "__typename": {"S": "OfficialContact"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
    ]
    for item in rows:
        print(f"Upsert OfficialContact id={item['id']['S']}")
        put_dynamo(OFFICIAL_CONTACT_TABLE, item)


def seed_sitecopy(ts: str) -> None:
    # Keep in sync with src/app/cms-admin/cms-sitecopy-seed-defaults.ts
    rows = [
        {
            "id": {"S": "topTasksKicker"},
            "key": {"S": "topTasksKicker"},
            "valueEn": {"S": "Quick Tasks"},
            "valueEs": {"S": "Tareas rapidas"},
            "description": {"S": "Homepage Quick Tasks kicker above How do I…"},
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
            "description": {"S": "Homepage How do I… section heading"},
            "active": {"BOOL": True},
            "displayOrder": {"N": "2"},
            "__typename": {"S": "SiteCopy"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
        {
            "id": {"S": "contactTownHallAddress"},
            "key": {"S": "contactTownHallAddress"},
            "valueEn": {"S": "304 Main Street, Wiley, CO 81092"},
            "valueEs": {"S": "304 Main Street, Wiley, CO 81092"},
            "description": {"S": "Town Hall card street address on /contact"},
            "active": {"BOOL": True},
            "displayOrder": {"N": "10"},
            "__typename": {"S": "SiteCopy"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
        {
            "id": {"S": "contactTownHallPhone"},
            "key": {"S": "contactTownHallPhone"},
            "valueEn": {"S": "(719) 829-4974"},
            "valueEs": {"S": "(719) 829-4974"},
            "description": {"S": "Town Hall card phone number on /contact"},
            "active": {"BOOL": True},
            "displayOrder": {"N": "11"},
            "__typename": {"S": "SiteCopy"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        },
    ]
    for item in rows:
        print(f"Upsert SiteCopy key={item['key']['S']}")
        put_dynamo(SITECOPY_TABLE, item)


def seed_leadership_roster(ts: str) -> None:
    """Keep in sync with src/app/leadership-roster-seed.ts."""
    rows = [
        {
            "id": "roster-mayor-council-0",
            "groupId": "mayor-council",
            "lineEn": "Mayor: Steve McKitrick",
            "lineEs": "Alcalde: Steve McKitrick",
            "displayOrder": 0,
        },
        {
            "id": "roster-mayor-council-1",
            "groupId": "mayor-council",
            "lineEn": "Councilman: Julie Esgar",
            "lineEs": "Concejal: Julie Esgar",
            "displayOrder": 1,
        },
        {
            "id": "roster-mayor-council-2",
            "groupId": "mayor-council",
            "lineEn": "Councilman: Dale Specht",
            "lineEs": "Concejal: Dale Specht",
            "displayOrder": 2,
        },
        {
            "id": "roster-mayor-council-3",
            "groupId": "mayor-council",
            "lineEn": "Councilman: Dale Stewart",
            "lineEs": "Concejal: Dale Stewart",
            "displayOrder": 3,
        },
        {
            "id": "roster-mayor-council-4",
            "groupId": "mayor-council",
            "lineEn": "Councilman: Alan Campbell",
            "lineEs": "Concejal: Alan Campbell",
            "displayOrder": 4,
        },
        {
            "id": "roster-mayor-council-5",
            "groupId": "mayor-council",
            "lineEn": "Councilman: Sandy Coen",
            "lineEs": "Concejal: Sandy Coen",
            "displayOrder": 5,
        },
        {
            "id": "roster-town-administration-0",
            "groupId": "town-administration",
            "lineEn": "City Clerk: Deb Dillon",
            "lineEs": "Secretaria municipal: Deb Dillon",
            "displayOrder": 0,
        },
        {
            "id": "roster-town-administration-1",
            "groupId": "town-administration",
            "lineEn": "Town Superintendent: Scott Whitman",
            "lineEs": "Superintendente del pueblo: Scott Whitman",
            "displayOrder": 1,
        },
    ]

    for row in rows:
        item = {
            "id": {"S": row["id"]},
            "groupId": {"S": row["groupId"]},
            "lineEn": {"S": row["lineEn"]},
            "lineEs": {"S": row["lineEs"]},
            "displayOrder": {"N": str(row["displayOrder"])},
            "active": {"BOOL": True},
            "__typename": {"S": "LeadershipRosterEntry"},
            "createdAt": {"S": ts},
            "updatedAt": {"S": ts},
        }
        print(f"Upsert LeadershipRosterEntry id={row['id']} groupId={row['groupId']}")
        put_dynamo(LEADERSHIP_ROSTER_TABLE, item)


def verify_graphql() -> None:
    import urllib.request

    queries = {
        "listOfficialContacts": (
            "query { listOfficialContacts(limit: 10) { items { id label value } } }"
        ),
        "listSiteCopies": (
            "query { listSiteCopies(limit: 10) { items { id key valueEn valueEs active } } }"
        ),
        "listLeadershipRosterEntries": (
            "query { listLeadershipRosterEntries(limit: 20) { items { id groupId lineEn lineEs displayOrder active } } }"
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
    seed_leadership_roster(ts)
    if not DRY_RUN:
        if not API_KEY:
            print("Skipping GraphQL verify: set APPSYNC_CMS_API_KEY or APPSYNC_API_KEY")
        else:
            verify_graphql()
    print("CMS production seed complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
