# Real Local Patch Sandbox — V167.0

Bounded, reversible, local-only patch environment backed by chain baseline. No production touching.

## Exports

- `buildRealLocalPatchSandbox(input)` — build sandbox record
- `validateRealLocalPatchSandbox(sandbox)` — validate invariants
- `renderRealLocalPatchSandbox(sandbox)` — human-readable render
- `REAL_LOCAL_PATCH_SANDBOX_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `SANDBOX_BLOCKED_INPUT` | Missing or invalid required fields |
| `SANDBOX_BLOCKED_CHAIN` | Chain baseline not READY |
| `SANDBOX_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `SANDBOX_READY` | Sandbox validated, ready for patch operations |
| `SANDBOX_FAIL` | Sandbox setup failed |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always
- `is_real_execution=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
