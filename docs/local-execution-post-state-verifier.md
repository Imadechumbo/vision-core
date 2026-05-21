# Local Execution Post-State Verifier — V164.0

Verifies post-execution local state: hashes, touched files, invariants, absence of production. No production, no deploy, no stable, no release.

## Exports

- `buildLocalExecutionPostStateVerifier(input)` — build verifier record
- `validateLocalExecutionPostStateVerifier(verifier)` — validate invariants
- `renderLocalExecutionPostStateVerifier(verifier)` — human-readable render
- `LOCAL_EXECUTION_POST_STATE_STATUSES` — status constants

## Statuses

| Status | Meaning |
|--------|---------|
| `LOCAL_POST_STATE_BLOCKED_INPUT` | Missing required fields |
| `LOCAL_POST_STATE_BLOCKED_RECEIPT` | Missing receipt_id |
| `LOCAL_POST_STATE_BLOCKED_FORBIDDEN_FILE` | Forbidden file in changed_files |
| `LOCAL_POST_STATE_BLOCKED_PRODUCTION` | local_only=false or production_touched=true |
| `LOCAL_POST_STATE_VERIFIED` | Hash match, state verified |
| `LOCAL_POST_STATE_MISMATCH` | Hash mismatch detected |

## Invariants

- `local_only=true` always
- `production_touched=false` always
- `deploy_performed=false` always
- `stable_promoted=false` always
- `release_performed=false` always

## REGRA ABSOLUTA

SEM PASS GOLD REAL → não promove, não libera, não marca stable.
