# Hello-from guestbook

Public page: **https://townofwiley.gov/hello-from**
Staff log: **https://townofwiley.gov/admin/hello-from** (Cognito **Staff** sign-in required)

## Deploy backend

```bash
export AWS_PROFILE=townofwiley
npm run deploy:guestbook
```

Set Amplify branch env **`GUESTBOOK_API_ENDPOINT`** to the printed Lambda base URL (no trailing slash), then redeploy `main` and run `npm run generate:runtime-config`.

Local dev: add to `secrets/local/user-secrets.json`:

```json
{
  "guestbook": {
    "apiEndpoint": "https://….lambda-url.us-east-2.on.aws"
  }
}
```

## Behavior

| Endpoint | Who | Purpose |
|----------|-----|---------|
| `POST /visit` | Public | Logs a page view with coarse geo (CloudFront country headers when present, else IP lookup via ip-api.com) |
| `POST /message` | Public | Publishes a voluntary “Hello from …” greeting after validation |
| `GET /messages` | Public | Lists published greetings for the map cards |
| `GET /admin/logs` | Staff JWT | Full visit + message log (hashed IP only, no raw IP on the page) |

WAF rate limits on the Function URL are recommended (see `docs/AWS_INFRASTRUCTURE_SOT.md` AP-16).
