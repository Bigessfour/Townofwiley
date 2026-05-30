#!/usr/bin/env bash
# Prints the ordered production cutover checklist. Does NOT run lock/refactor automatically.
# See docs/amplify-gen2-migration-plan.md
set -euo pipefail

cat <<'EOF'
Gen 2 production cutover (manual steps)

1. Confirm https://gen2-main.d331voxr1fhoir.amplifyapp.com is green (CMS + /admin + staff login).
2. git checkout main && amplify env checkout main && amplify pull
3. npm run amplify:gen2:lock
4. npm run amplify:gen2:assess  # record Gen2 root stack name
5. npm run amplify:gen2:refactor -- --to <Gen2RootStackName>
6. On gen2-main: uncomment postRefactor() in amplify/backend.ts, push, wait for build.
7. Amplify Console: point townofwiley.gov to branch gen2-main.
8. After 48h: npm run amplify:gen2:retain on main; decommission Gen1 root stack per AWS docs.

Abort if step 1 fails. Do not lock production until gen2-main preview passes.
EOF
