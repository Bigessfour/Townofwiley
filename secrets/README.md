# User Secrets Locker

This folder separates secrets into two layers:

- `secrets/local` is the editable plaintext workspace and is shielded by gitignore.
- `secrets/encrypted` contains the tracked encrypted lockbox that is safe to commit.

The locker is managed by `scripts/user-secrets.mjs`.

Supported commands:

- `npm run secrets:init`
- `npm run secrets:init:local-passphrase`
- `npm run secrets:status`
- `npm run secrets:unlock`
- `npm run secrets:lock`
- `npm run secrets:lock:prune`
- `npm run secrets:prune-local`
- `npm run secrets:import-env`

The encrypted lockbox is portable across machines. The passphrase is not committed and must be provided by either:

- `TOW_SECRETS_PASSPHRASE`
- `secrets/local/.passphrase` if you explicitly opt into local plaintext passphrase storage on that machine

Do not commit plaintext files from `secrets/local`.

Recommended usage:

1. Unlock when you need to edit or inspect local secrets.
2. Lock and prune when you are done so the repo only carries the encrypted lockbox.
