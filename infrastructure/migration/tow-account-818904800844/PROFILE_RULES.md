# Profile freeze rules (account migration)

| Prefix | Account        | Owner                                               | Profile                       |
| ------ | -------------- | --------------------------------------------------- | ----------------------------- |
| **3**  | `388691194728` | Code Platoon                                        | `codeplatoon`                 |
| **5**  | `570912405222` | **Steve personal** (legacy live site until cutover) | `steve`, legacy `townofwiley` |
| **8**  | `818904800844` | **Town of Wiley official**                          | `tow`                         |

## Rules

1. Before every mutating AWS command: `aws sts get-caller-identity --profile <name>` and confirm Account.
2. Official Town work uses **`tow`** (`818…`). Profile `townofwiley` is a **legacy name** for Steve’s personal account (`570…`).
3. Do **not** change MX away from `mail.townofwiley.gov` / Synology (`208.117.67.118`).
4. Do **not** delete the old Route 53 zone until registrar NS and mail are verified on the new zone.
5. Leave `stephenmckitrick.com` and non-TOW resources in `570…` alone.

## Source inventory

Exported under `exports/` (gitignored). Regenerated with:

```bash
export AWS_PROFILE=townofwiley   # or steve, once logged in — same 570… account
export AWS_DEFAULT_REGION=us-east-2
# see scripts/export-source-inventory.sh
```
