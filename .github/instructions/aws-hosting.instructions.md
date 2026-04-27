---
description: "Use when managing AWS hosting elements for this repo, including Amplify builds, CloudFormation, IAM, S3, AppSync, and deployment troubleshooting."
name: "AWS Hosting Standards"
applyTo:
  - "amplify/**"
  - "amplify.yml"
  - "src/app/amplify-config.ts"
  - "docs/amplify-*.md"
---
# AWS Hosting Standards

- Use the repository runbooks in `docs/` first, especially the Amplify deployment guide.
- Keep Amplify hosting changes aligned with the current app ID, branch, and region documented in the repo.
- Prefer the AWS Toolkit and AWS AI Toolkit extensions for cloud navigation when they are available in VS Code.
- Keep CloudFormation, IAM, and S3 changes narrow and reversible.
- Treat backend changes as hosting changes when they affect Amplify deploys, storage buckets, or service roles.
- Do not change secrets or environment values unless the repo scripts or runbooks call for it.
- Verify hosting changes against the existing CI and deployment workflow before widening scope.
