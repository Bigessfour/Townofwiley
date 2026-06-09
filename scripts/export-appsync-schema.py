#!/usr/bin/env python3
import json
import os
import subprocess

API_ID = os.environ.get("APPSYNC_API_ID", "j7b2x3sh7rcezekekkxxiak7hi")
REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")
PROFILE = os.environ.get("AWS_PROFILE", "townofwiley")
OUT = os.environ.get("OUT", "schema-export.graphql")
env = {**os.environ, "AWS_PROFILE": PROFILE, "AWS_DEFAULT_REGION": REGION}


def aws(*args: str) -> dict:
    return json.loads(subprocess.check_output(["aws", *args, "--region", REGION, "--output", "json"], env=env, text=True))


parts: list[str] = []
token = None
while True:
    cmd = ["aws", "appsync", "list-types", "--api-id", API_ID, "--format", "SDL", "--max-results", "25"]
    if token:
        cmd.extend(["--next-token", token])
    page = aws(*cmd[1:])
    for t in page.get("types", []):
        parts.append(t.get("definition", "").strip())
    token = page.get("nextToken")
    if not token:
        break

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n\n".join(parts) + "\n")

print(f"Wrote {len(parts)} types to {OUT}")
